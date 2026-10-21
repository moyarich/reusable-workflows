import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
function run(command, args) {
  const result = spawnSync(command, args, { cwd: repoRoot, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(command + " exited with " + result.status);
}
// One multi-entry build shares chunks in assets/ instead of duplicating per action.
run("npm", [
  "exec",
  "--",
  "vite",
  "build",
  "--config",
  "packages/actions/vite.config.ts",
]);
run(process.execPath, ["packages/actions/scripts/generate-actions.mjs"]);
