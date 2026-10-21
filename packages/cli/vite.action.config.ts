import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vite";
import { githubActions } from "@moyarich/vite-github-actions";

const packageRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(packageRoot, "../..");

// Paths are resolved explicitly because Vite is launched from the monorepo root.
export default defineConfig({
  plugins: [
    githubActions({
      sourcesDir: resolve(packageRoot, "src/actions"),
      actionsDir: resolve(repositoryRoot, "actions"),
      outputDir: resolve(repositoryRoot, "actions/dist"),
      target: "node24",
      bundleDependencies: true,
      validateMetadata: true,
    }),
  ],
});
