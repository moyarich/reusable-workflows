/** CLI adapter for distribution selection and GitHub Actions outputs. */
import fs from "node:fs";
import { parse } from "yaml";
import { validateSchema } from "../validate-schema/validate-schema.js";
import configSchema from "../schemas/check-dist-config.schema.json" with { type: "json" };

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
  const parsedConfig: unknown = fs.existsSync(configPath)
    ? parse(fs.readFileSync(configPath, "utf8"))
    : {};
  const validation = validateSchema(
    configSchema,
    parsedConfig,
    "check-dist configuration",
  );
  if (validation.valid === false) throw new Error(validation.error);
  const config = parsedConfig as Config;
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
