import { InvalidArgumentError } from "commander";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export type WorkspaceToolsSource = {
  mode: "registry" | "current" | "upstream";
  value: string;
  source: string;
};

export function parseWorkspaceToolsSource(source: string): WorkspaceToolsSource {
  if (source === "checkout:current") return { mode: "current", value: "", source };
  if (source.startsWith("registry:npm:")) {
    const value = source.slice("registry:npm:".length);
    if (value !== "latest" && !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.+-]+)?$/.test(value))
      throw new InvalidArgumentError("Expected npm latest or an explicit npm version");
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

export function resolveBinDir(
  mode: WorkspaceToolsSource["mode"],
  paths: { workspace: string; runnerTemp: string; releaseBin?: string },
): string {
  if (mode === "current") return join(paths.workspace, "packages/workspace-tools/dist/bin");
  if (mode === "upstream") return join(paths.runnerTemp, "workspace-tools-upstream/packages/workspace-tools/dist/bin");
  if (!paths.releaseBin) throw new Error("registry source requires the workspace-release executable path");
  return dirname(resolve(paths.releaseBin));
}

export function validateBinDir(dir: string): void {
  for (const cli of ["workspace-release.mjs", "workspace-publish.mjs"]) {
    if (!existsSync(join(dir, cli))) throw new Error(`Workspace Tools CLI is missing: ${join(dir, cli)}`);
  }
}

