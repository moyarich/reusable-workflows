/** Build configuration for CLI executable and library output. @module */
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root = dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  root,
  build: {
    ssr: true,
    target: "node24",
    outDir: resolve(root, "dist"),
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: {
        cli: resolve(root, "src/cli.ts"),
        "workspace-source": resolve(root, "src/bin/workspace-source-entry.ts"),
        "release-validate": resolve(root, "src/bin/release-validate-entry.ts"),
        browser: resolve(root, "src/bin/browser.ts"),
        "setup-workspace-tools": resolve(
          root,
          "src/setup-workspace-tools/setup-workspace-tools-cli.ts",
        ),
      },
      output: {
        entryFileNames: "[name].mjs",
        chunkFileNames: "chunks/[name]-[hash].mjs",
        banner: (chunk) => (chunk.isEntry ? "#!/usr/bin/env node" : ""),
      },
    },
  },
});
