/** CLI adapter for distribution selection and GitHub Actions outputs. */
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { selectDistributionTargets } from "./select-targets.js";
import type { Config, Package } from "./select-targets.js";

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
