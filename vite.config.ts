import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vite";

export const actionEntries = Object.fromEntries(
  readdirSync("src/actions", { withFileTypes: true })
    .filter((directory) => directory.isDirectory())
    .map(({ name }) => {
      const root = join("src/actions", name);
      const entry = ["index.ts", `${name}-cli.ts`].find((file) =>
        existsSync(join(root, file)),
      );
      if (!entry)
        throw new Error(
          `Missing action entry point for ${name}: expected index.ts or ${name}-cli.ts`,
        );
      return [name, join(root, entry)];
    }),
);

export default defineConfig(({ mode }) => {
  if (mode === "test") return { test: { environment: "node" } };
  const entry = actionEntries[mode];
  if (!entry) throw new Error(`Unknown action build mode: ${mode}`);
  return {
    ssr: { noExternal: true },
    build: {
      ssr: entry,
      target: "node24",
      outDir: "actions/dist",
      emptyOutDir: false,
      minify: false,
      sourcemap: false,
      rollupOptions: {
        output: {
          entryFileNames: `${mode}.mjs`,
          banner:
            mode === "setup-workspace-tools"
              ? "#!/usr/bin/env node"
              : undefined,
        },
      },
    },
  };
});
