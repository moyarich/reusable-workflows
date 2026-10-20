import { defineConfig } from "vite";
export default defineConfig({
  build: {
    ssr: true,
    target: "node24",
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: "src/cli.ts",
      output: { entryFileNames: "cli.mjs", banner: "#!/usr/bin/env node" },
    },
  },
});
