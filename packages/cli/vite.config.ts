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
        cli: resolve(root, "src/bin/cli-entries.ts"),
      },
      output: {
        entryFileNames: "bin/[name].mjs",
        chunkFileNames: "chunks/[name]-[hash].mjs",
        banner: (chunk) => (chunk.isEntry ? "#!/usr/bin/env node" : ""),
      },
    },
  },
});
