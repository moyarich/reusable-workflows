import { I as InvalidArgumentError, C as Command } from "./assets/esm-C5EVGJJV.js";
import { existsSync, appendFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import "node:events";
import "node:child_process";
import "node:process";
function parseWorkspaceToolsSource(source) {
  if (source === "checkout:current")
    return { mode: "current", value: "", source };
  if (source.startsWith("registry:npm:")) {
    const value = source.slice("registry:npm:".length);
    if (value !== "latest" && !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.+-]+)?$/.test(value))
      throw new InvalidArgumentError(
        "Expected npm latest or an explicit npm version"
      );
    return { mode: "registry", value, source };
  }
  const match = /^checkout:upstream;(branch|tag|sha):(.+)$/.exec(source);
  if (match) {
    const [, kind, ref] = match;
    if (kind === "sha") {
      if (!/^[0-9a-fA-F]{40}$/.test(ref))
        throw new InvalidArgumentError("Expected a full 40-character SHA");
    } else if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(ref) || ref.includes(".."))
      throw new InvalidArgumentError("Invalid Git ref");
    const value = kind === "branch" ? `refs/heads/${ref}` : kind === "tag" ? `refs/tags/${ref}` : ref;
    return { mode: "upstream", value, source };
  }
  throw new InvalidArgumentError(`Invalid workspace-tools source: ${source}`);
}
function resolveBinDir(mode, paths) {
  if (mode === "current")
    return join(paths.workspace, "packages/workspace-tools/dist/bin");
  if (mode === "upstream")
    return join(
      paths.runnerTemp,
      "workspace-tools-upstream/packages/workspace-tools/dist/bin"
    );
  if (!paths.releaseBin)
    throw new Error(
      "registry source requires the workspace-release executable path"
    );
  return dirname(resolve(paths.releaseBin));
}
function validateBinDir(dir) {
  for (const cli of ["workspace-release.mjs", "workspace-publish.mjs"]) {
    if (!existsSync(join(dir, cli)))
      throw new Error(`Workspace Tools CLI is missing: ${join(dir, cli)}`);
  }
}
const program = new Command().name("setup-workspace-tools").requiredOption(
  "--workspace-tools-source <source>",
  "npm source or checkout reference"
).option("--mode <mode>", "resolve | bin-dir", "resolve").option(
  "--workspace <path>",
  "GitHub workspace",
  process.env.GITHUB_WORKSPACE
).option(
  "--runner-temp <path>",
  "GitHub runner temporary directory",
  process.env.RUNNER_TEMP
).option("--release-bin <path>", "Resolved workspace-release executable").option(
  "--github-output <path>",
  "GitHub Actions output file",
  process.env.GITHUB_OUTPUT
).action((opts) => {
  const source = parseWorkspaceToolsSource(opts.workspaceToolsSource);
  let entries;
  if (opts.mode === "resolve")
    entries = { mode: source.mode, value: source.value };
  else if (opts.mode === "bin-dir") {
    if (!opts.workspace || !opts.runnerTemp)
      throw new Error("workspace and runner-temp are required");
    const binDir = resolveBinDir(source.mode, {
      workspace: opts.workspace,
      runnerTemp: opts.runnerTemp,
      releaseBin: opts.releaseBin
    });
    validateBinDir(binDir);
    entries = { "bin-dir": binDir, source: source.source };
  } else throw new InvalidArgumentError("mode must be resolve or bin-dir");
  if (opts.githubOutput)
    appendFileSync(
      opts.githubOutput,
      Object.entries(entries).map(([key, value]) => `${key}=${value}
`).join("")
    );
  else process.stdout.write(JSON.stringify(entries) + "\n");
});
await program.parseAsync();
