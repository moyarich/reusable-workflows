/** Bundle the combined CLI as a self-contained workflow runtime. */
import { defineConfig } from "vite";
import { runtimeAssets } from "./plugins/runtime-assets.ts";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  root,
  resolve: { alias: { "@": resolve(root, "src") } },
  ssr: { noExternal: true },
  plugins: [
    runtimeAssets({
      source: resolve(root, "src/schemas/copy-config.schema.json"),
      destination: "copy-files-config.schema.json",
    }),
  ],
  build: {
    ssr: true,
    target: "node24",
    outDir: resolve(root, "../../actions/cli"),
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: resolve(root, "src/bin/cli-entries.ts"),
      output: { entryFileNames: "index.mjs", banner: "#!/usr/bin/env node" },
    },
  },
});
