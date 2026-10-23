/** Select distribution targets without touching the filesystem or environment. */
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export type Package = {
  name: string;
  directory: string;
  [key: string]: unknown;
};
export type Config = {
  packages?: Record<
    string,
    { distPath?: string; buildCommand?: string; commitDist?: boolean }
  >;
  extraPackages?: Package[];
};
export type SelectionOptions = {
  discovered: Package[];
  config: Config;
  requested: string;
  distPathOverride?: string;
  buildCommandOverride?: string;
};

/** Produce a GitHub Actions matrix from explicit inputs. Does not mutate inputs. */
export function selectDistributionTargets({
  discovered,
  config,
  requested,
  distPathOverride = "",
  buildCommandOverride = "",
}: SelectionOptions) {
  const overrides = config.packages ?? {};
  const available = [...discovered, ...(config.extraPackages ?? [])];
  const selected =
    requested === "all"
      ? available
      : available.filter(
          (p) => p.directory === requested || p.name === requested,
        );
  if (selected.length === 0) throw new Error("No packages match: " + requested);
  const include = selected.map((p) => {
    const settings = {
      ...(overrides.all ?? {}),
      ...(overrides[p.name] ?? {}),
      ...(overrides[p.directory] ?? {}),
    };
    const dir = p.directory === "." ? "root" : p.directory;
    return {
      ...p,
      artifactSuffix: dir
        .replace(/^(packages|apps)\//, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "-"),
      commitDist: settings.commitDist ?? false,
      distTemplate:
        distPathOverride || settings.distPath || "{packageDir}/dist",
      buildCommand:
        buildCommandOverride ||
        settings.buildCommand ||
        (p.directory === "."
          ? "npm run build"
          : "npm run build --workspace " + p.name),
    };
  });
  return {
    matrix: { include },
    hasPackages: true,
    singlePackage: selected.length === 1,
    directories: selected.map((p) => p.directory),
  };
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) throw new Error("Missing " + name);
  return value;
}

/** Read CI inputs and emit GitHub outputs; called only by the CLI entrypoint. */
export function runSelection(env: NodeJS.ProcessEnv = process.env): void {
  const report = JSON.parse(required(env, "DISCOVERED")) as {
    included: Package[];
  };
  const configPath = required(env, "CONFIG_FILE");
  const config: Config = fs.existsSync(configPath)
    ? (JSON.parse(
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
      ) as Config)
    : {};
  const result = selectDistributionTargets({
    discovered: report.included,
    config,
    requested: required(env, "PACKAGES").trim(),
    distPathOverride: env.DIST_PATH_OVERRIDE,
    buildCommandOverride: env.BUILD_COMMAND_OVERRIDE,
  });
  fs.appendFileSync(
    required(env, "GITHUB_OUTPUT"),
    [
      "matrix=" + JSON.stringify(result.matrix),
      "has-packages=" + result.hasPackages,
      "single-package=" + result.singlePackage,
      "",
    ].join("\n"),
  );
  console.log("Selected distribution targets:", result.directories.join(", "));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runSelection();
}
