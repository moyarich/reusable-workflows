import { defineConfig } from "vite";
import { githubActions } from "@moyarich/vite-github-actions";

// Paths are relative to packages/actions, where Vite runs.
export default defineConfig({
  plugins: [
    githubActions({
      entries: {
        "browser-extension-publish": "../cli/src/browser-extension-publish/entry.ts",
        "copy-files-to-another-repository": "../cli/src/copy-files-to-another-repository/index.ts",
        "release-draft-sync": "../cli/src/release-draft-sync/action-entry.ts",
        "setup-workspace-tools": "../cli/src/setup-workspace-tools/action-entry.ts",
        "validate-release-identity": "../cli/src/validate-release-identity/action-entry.ts",
      },
      metadataDir: "actions",
      outputDir: "dist/.bundles",
      distributionDir: "../../actions",
      generateDistributions: true,
      sharedChunks: true,
      runtimeFiles: {
        "check-dist": {
          "select.mjs": "../cli/src/check-dist/select.ts",
          "select-targets.js": "../cli/src/check-dist/select-targets.ts",
          "config.schema.json": "../../.github/reusable-configurations/check-dist-config.schema.json",
        },
        "resolve-workspaces": {
          "index.mjs": "../cli/src/resolve-workspaces/index.ts",
          "workspace-rules.js": "../cli/src/resolve-workspaces/workspace-rules.ts",
          "resolve-manifests.js": "../cli/src/resolve-workspaces/resolve-manifests.ts",
        },
        "workflow-dispatch": {
          "index.mjs": "../cli/src/workflow-dispatch/workflow-dispatch.ts",
          "dispatch-rules.js": "../cli/src/workflow-dispatch/dispatch-rules.ts",
        },
        "verify-workflow-runs": {
          "index.mjs": "../cli/src/verify-workflow-runs/index.ts",
          "select-run.js": "../cli/src/verify-workflow-runs/select-run.ts",
        },
      },
    }),
  ],
});
