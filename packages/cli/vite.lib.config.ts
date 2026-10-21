import { defineConfig } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

// Side-effect-free modules for consumers; do not publish GitHub Action entry points.
export default defineConfig({
  root,
  build: {
    ssr: true,
    target: "node24",
    outDir: resolve(root, "dist/lib"),
    emptyOutDir: false,
    minify: false,
    rollupOptions: {
      input: {
        index: resolve(root, "src/index.ts"),
        "release-identity": resolve(root, "src/release-draft-sync/identity.ts"),
        "workspace-source": resolve(
          root,
          "src/setup-workspace-tools/setup-workspace-tools.ts",
        ),
        "browser-manifest": resolve(
          root,
          "src/browser-extension-publish/manifest.ts",
        ),
      },
      output: {
        entryFileNames: "[name].mjs",
        chunkFileNames: "chunks/[name]-[hash].mjs",
      },
    },
  },
});
