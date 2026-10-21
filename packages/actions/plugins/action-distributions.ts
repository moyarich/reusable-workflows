import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import type { Plugin } from "vite";

/**
 * Assemble the published action distribution after Vite finishes bundling.
 *
 * Source action metadata lives under packages/actions/actions, while compiled
 * entrypoints are staged in packages/actions/dist/.bundles. The generator
 * copies both into the disposable repository-level actions/ distribution.
 *
 * Distribution correctness remains the responsibility of check-dist.
 */
export function actionDistributions(): Plugin {
  const script = fileURLToPath(new URL("../scripts/generate-actions.mjs", import.meta.url));
  const root = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
  return {
    name: "reusable-workflows:action-distributions",
    apply: "build",
    enforce: "post",
    closeBundle() {
      const result = spawnSync(process.execPath, [script], {
        cwd: root,
        stdio: "inherit",
      });
      if (result.error) throw result.error;
      if (result.status !== 0) {
        throw new Error(`Action distribution generation failed (exit ${result.status ?? "unknown"})`);
      }
    },
  };
}
