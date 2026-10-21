import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const actions = [
  "browser-extension-publish",
  "release-draft-sync",
  "setup-workspace-tools",
  "validate-release-identity",
];
for (const name of actions) {
  const result = spawnSync(
    "npm",
    [
      "exec",
      "--",
      "vite",
      "build",
      "--config",
      "packages/cli/vite.action.config.ts",
      "--mode",
      name,
    ],
    { cwd: repoRoot, stdio: "inherit" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("Failed to build action: " + name);
}
const generated = spawnSync(
  process.execPath,
  ["packages/cli/scripts/generate-actions.mjs"],
  { cwd: repoRoot, stdio: "inherit" },
);
if (generated.error) throw generated.error;
if (generated.status !== 0) process.exit(generated.status || 1);
