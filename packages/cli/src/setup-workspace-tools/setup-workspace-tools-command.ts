/** Commander-powered CLI command and feature implementation. @module */
import { Command, InvalidArgumentError } from "commander";
import { appendFileSync } from "node:fs";
import {
  parseWorkspaceToolsSource,
  resolveBinDir,
  validateBinDir,
} from "./setup-workspace-tools";

export function createSetupWorkspaceToolsCommand(): Command {
  return new Command()
  .name("setup-workspace-tools")
  .requiredOption(
    "--workspace-tools-source <source>",
    "npm source or checkout reference",
  )
  .option("--mode <mode>", "resolve | bin-dir", "resolve")
  .option(
    "--workspace <path>",
    "GitHub workspace",
    process.env.GITHUB_WORKSPACE,
  )
  .option(
    "--runner-temp <path>",
    "GitHub runner temporary directory",
    process.env.RUNNER_TEMP,
  )
  .option("--release-bin <path>", "Resolved workspace-release executable")
  .option(
    "--github-output <path>",
    "GitHub Actions output file",
    process.env.GITHUB_OUTPUT,
  )
  .action((opts) => {
    const source = parseWorkspaceToolsSource(opts.workspaceToolsSource);
    let entries: Record<string, string>;
    if (opts.mode === "resolve")
      entries = { mode: source.mode, value: source.value };
    else if (opts.mode === "bin-dir") {
      if (!opts.workspace || !opts.runnerTemp)
        throw new Error("workspace and runner-temp are required");
      const binDir = resolveBinDir(source.mode, {
        workspace: opts.workspace,
        runnerTemp: opts.runnerTemp,
        releaseBin: opts.releaseBin,
      });
      validateBinDir(binDir);
      entries = { "bin-dir": binDir, source: source.source };
    } else throw new InvalidArgumentError("mode must be resolve or bin-dir");
    if (opts.githubOutput)
      appendFileSync(
        opts.githubOutput,
        Object.entries(entries)
          .map(([key, value]) => `${key}=${value}\n`)
          .join(""),
      );
    else process.stdout.write(JSON.stringify(entries) + "\n");
  });

}

