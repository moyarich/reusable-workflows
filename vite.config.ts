import { defineConfig } from "vite";
import { githubActions } from "@moyarich/vite-github-actions";

export default defineConfig(() => {
  return {
    plugins: [
      githubActions({
        sourcesDir: "src/actions",
        actionsDir: "actions",
        outputDir: "actions/dist",
        target: "node24",
        bundleDependencies: true,
        validateMetadata: true,
      }),
    ],
  };
});
