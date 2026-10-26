/** Build the combined npm executable declared in package.json. */
import { defineConfig, runnerImport } from "vite";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { runtimeAssets } from "./plugins/runtime-assets.ts";

// The Git dependency ships TypeScript but has no prepared dist bundle.
// Prefer its public entry when available; otherwise load its shipped source.
const packageBinEntry = new URL(
  import.meta.resolve("@moyarich/vite-plugin-package-bin"),
);
const { packageBinBuild } = existsSync(packageBinEntry)
  ? ((await import(
      packageBinEntry.href
    )) as typeof import("@moyarich/vite-plugin-package-bin"))
  : (
      await runnerImport<typeof import("@moyarich/vite-plugin-package-bin")>(
        fileURLToPath(new URL("../src/index.ts", packageBinEntry)),
        {
          configFile: false,
          ssr: { noExternal: ["@moyarich/vite-plugin-package-bin"] },
        },
      )
    ).module;

const root = dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  root,
  plugins: [
    packageBinBuild({
      emptyOutDir: true,
      outDir: "dist",
      sources: { "reusable-workflows-cli": "src/bin/cli-entries.ts" },
      target: "node24",
      external: [/^(?:commander|ajv|yaml)(?:\/|$)/],
      minify: false,
    }),
    runtimeAssets({
      source: resolve(root, "src/check-dist/config.schema.json"),
      destination: "schemas/check-dist.schema.json",
    }),
  ],
  build: { outDir: "dist" },
});
