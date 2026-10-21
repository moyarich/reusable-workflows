import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  build: {
    ssr: resolve(root, "src/cli.ts"),
    target: "node24",
    outDir: resolve(root, "dist"),
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      output: { entryFileNames: "cli.mjs", banner: "#!/usr/bin/env node" },
    },
  },
});
