import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const packageRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(packageRoot, "../..");
const sourcesDir = resolve(packageRoot, "src/actions");
const actionsDir = resolve(repositoryRoot, "actions");
const outputDir = resolve(actionsDir, "dist");

// GitHub Action JS bundles are a repository artifact, not an npm package artifact.
// Keep discovery local so npm install never depends on an unbuilt Git Vite plugin.
function entriesForActions(): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const dir of readdirSync(sourcesDir, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const name = dir.name;
    const source = [join(sourcesDir, name, "index.ts"), join(sourcesDir, name, name + "-cli.ts")]
      .find((filename) => existsSync(filename));
    if (!source) throw new Error(`Missing bundled action entry: ${name}`);
    entries[name] = source;

    // Composite actions can use their own scripts; node24 metadata must point
    // to the real compiled distribution bundle.
    const metadata = join(actionsDir, name, "action.yml");
    if (existsSync(metadata)) {
      const yaml = readFileSync(metadata, "utf8");
      if (/using:\\s*node24/.test(yaml) && !yaml.includes("../dist/" + name + ".mjs")) {
        throw new Error(`Node action metadata must reference ../dist/${name}.mjs: ${metadata}`);
      }
    }
  }
  if (!Object.keys(entries).length) throw new Error("No GitHub Action entries found");
  return entries;
}

export default defineConfig({
  ssr: { noExternal: true },
  build: {
    ssr: true,
    target: "node24",
    outDir: outputDir,
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: entriesForActions(),
      output: { entryFileNames: "[name].mjs" },
    },
  },
});
