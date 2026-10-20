import { defineConfig } from "vite";

const entries: Record<string, string> = {
  "setup-workspace-tools": "src/setup-workspace-tools/setup-workspace-tools-cli.ts",
  "release-draft-sync": "src/release-draft-sync/index.ts",
  "validate-release-identity": "src/validate-release-identity/index.ts",
};

export default defineConfig(({ mode }) => {
  const entry = entries[mode];
  if (!entry) throw new Error(`Unknown action build mode: ${mode}`);

  return {
    ssr: { noExternal: true },
    build: {
      ssr: entry,
      target: "node24",
      outDir: `actions/${mode}`,
      emptyOutDir: false,
      minify: false,
      sourcemap: false,
      rollupOptions: {
        output: {
          entryFileNames: mode === "setup-workspace-tools" ? "dist/setup-workspace-tools.mjs" : "index.mjs",
          banner: mode === "setup-workspace-tools" ? "#!/usr/bin/env node" : undefined,
        },
      },
    },
  };
});
