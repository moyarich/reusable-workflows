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
        "resolve-workspaces":
          "packages/cli/src/resolve-workspaces/action-entry.ts",
        "workflow-dispatch":
          "packages/cli/src/workflow-dispatch/action-entry.ts",
        "verify-workflow-runs":
          "packages/cli/src/verify-workflow-runs/action-entry.ts",
        "check-dist": "packages/cli/src/check-dist/action-entry.ts",
        "browser-extension-publish":
          "packages/cli/src/browser-extension-publish/action-entry.ts",
        "copy-files-to-another-repository":
          "packages/cli/src/copy-files-to-another-repository/action-entry.ts",
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
