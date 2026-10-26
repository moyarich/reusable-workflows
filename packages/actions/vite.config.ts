import { defineConfig } from "vite";
import { runtimeAssets } from "../cli/plugins/runtime-assets.js";
import { fileURLToPath } from "node:url";
import { githubActions } from "@moyarich/vite-github-actions";

// Run Vite locally in packages/actions; resolve distribution paths from the repository root.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("../cli/src", import.meta.url)) },
  },
  plugins: [
    githubActions({
      projectRoot: "../..",
      entries: {
        "check-dist": "packages/cli/src/check-dist/action-entry.ts",
        "browser-extension-publish":
          "packages/cli/src/browser-extension-publish/entry.ts",
        "copy-files-to-another-repository":
          "packages/cli/src/copy-files-to-another-repository/index.ts",
        "release-draft-sync":
          "packages/cli/src/release-draft-sync/action-entry.ts",
        "setup-workspace-tools":
          "packages/cli/src/setup-workspace-tools/action-entry.ts",
        "validate-release-identity":
          "packages/cli/src/validate-release-identity/action-entry.ts",
      },
      metadataDir: "packages/actions/actions",
      outputDir: "packages/actions/dist/.bundles",
      distributionDir: "actions",
      generateDistributions: true,
      sharedChunks: true,
      runtimeFiles: {
        "check-dist": {
          "check-dist-config.schema.json":
            "packages/cli/src/schemas/check-dist-config.schema.json",
        },
        "copy-files-to-another-repository": {
          "config.schema.json":
            "packages/cli/src/schemas/copy-config.schema.json",
        },
        "resolve-workspaces": {
          "index.mjs": "packages/cli/src/resolve-workspaces/index.ts",
          "workspace-rules.js":
            "packages/cli/src/resolve-workspaces/workspace-rules.ts",
          "resolve-manifests.js":
            "packages/cli/src/resolve-workspaces/resolve-manifests.ts",
        },
        "workflow-dispatch": {
          "index.mjs":
            "packages/cli/src/workflow-dispatch/workflow-dispatch.ts",
          "dispatch-rules.js":
            "packages/cli/src/workflow-dispatch/dispatch-rules.ts",
        },
        "verify-workflow-runs": {
          "index.mjs": "packages/cli/src/verify-workflow-runs/index.ts",
          "select-run.js":
            "packages/cli/src/verify-workflow-runs/select-run.ts",
        },
      },
    }),
    ...["check-dist-config.schema.json", "copy-config.schema.json"].map(
      (name) =>
        runtimeAssets({
          source: fileURLToPath(
            new URL(`../cli/src/schemas/${name}`, import.meta.url),
          ),
          destination: `schemas/${name}`,
          outputDirectory: fileURLToPath(
            new URL("../../actions", import.meta.url),
          ),
        }),
    ),
  ],
});
