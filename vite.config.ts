import { defineConfig } from "vite";
export default defineConfig({
  ssr: { noExternal: true },
  build: {
    ssr: "src/setup-workspace-tools/setup-workspace-tools-cli.ts",
    target: "node24",
    outDir: "dist/bin",
    emptyOutDir: true,
    minify: false,
    sourcemap: false,
    rollupOptions: { output: { entryFileNames: "setup-workspace-tools.mjs", banner: "#!/usr/bin/env node" } },
  },
});
