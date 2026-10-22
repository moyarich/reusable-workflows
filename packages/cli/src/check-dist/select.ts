type Package = { name: string; directory: string; [key: string]: unknown };
type Config = {
  packages?: Record<string, { distPath?: string; buildCommand?: string; commitDist?: boolean }>;
  extraPackages?: Package[];
};
const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error("Missing " + name);
  return value;
};
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const report = JSON.parse(required("DISCOVERED")) as { included: Package[] };
const configPath = required("CONFIG_FILE");
const config: Config = fs.existsSync(configPath)
  ? JSON.parse(
      execFileSync(
        "ruby",
        [
          "-r",
          "yaml",
          "-r",
          "json",
          "-e",
          "print JSON.generate(YAML.safe_load(File.read(ARGV.fetch(0)), aliases: false) || {})",
          configPath,
        ],
        { encoding: "utf8" },
      ),
    )
  : {};
const overrides = config.packages || {};
const allSettings = overrides.all || {};
const available = [...report.included, ...(config.extraPackages || [])];
const requested = required("PACKAGES").trim();
const selected =
  requested === "all"
    ? available
    : available.filter(
        (p) => p.directory === requested || p.name === requested,
      );
if (selected.length === 0) throw Error("No packages match: " + requested);
const matrix = {
  include: selected.map((p) => {
    const settings = {
      ...allSettings,
      ...(overrides[p.name] || {}),
      ...(overrides[p.directory] || {}),
    };
    const dir = p.directory === "." ? "root" : p.directory;
    return {
      ...p,
      artifactSuffix: dir
        .replace(/^(packages|apps)\//, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "-"),
      commitDist: settings.commitDist ?? false,
      distTemplate:
        process.env.DIST_PATH_OVERRIDE ||
        settings.distPath ||
        "{packageDir}/dist",
      buildCommand:
        process.env.BUILD_COMMAND_OVERRIDE ||
        settings.buildCommand ||
        (p.directory === "."
          ? "npm run build"
          : "npm run build --workspace " + p.name),
    };
  }),
};
fs.appendFileSync(
  required("GITHUB_OUTPUT"),
  "matrix=" + JSON.stringify(matrix) + "\n",
);
fs.appendFileSync(required("GITHUB_OUTPUT"), "has-packages=true\n");
fs.appendFileSync(
  required("GITHUB_OUTPUT"),
  "single-package=" + (selected.length === 1) + "\n",
);
console.log(
  "Selected distribution targets:",
  selected.map((p) => p.directory).join(", "),
);
