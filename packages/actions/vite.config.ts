import { defineConfig } from "vite";
import { githubActions } from "@moyarich/vite-github-actions";

// Run Vite locally in packages/actions; resolve distribution paths from the repository root.
export default defineConfig({
  plugins: [
    githubActions({
      projectRoot: "../..",
      entries: {
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
          "select.mjs": "packages/cli/src/check-dist/select.ts",
          "select-targets.js": "packages/cli/src/check-dist/select-targets.ts",
          "config.schema.json":
            ".github/reusable-configurations/check-dist-config.schema.json",
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
  ],
});
