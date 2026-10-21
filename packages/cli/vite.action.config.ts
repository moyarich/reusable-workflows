import { existsSync, lstatSync, realpathSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const packageRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(packageRoot, "../..");
const sourcesDir = resolve(packageRoot, "src/actions");
const actionsDir = resolve(repositoryRoot, "actions");
const outputDir = resolve(actionsDir, "dist");

// Vite may empty outDir during builds. Prove that it is a generated-only
// location and never a source directory or a symlink before allowing cleanup.
const sourceRoots = [resolve(packageRoot, "src"), resolve(packageRoot, "actions")];
if (outputDir !== resolve(repositoryRoot, "actions/dist")) {
  throw new Error("Refusing to build actions outside the expected generated directory");
}
for (const source of sourceRoots) {
  if (!existsSync(source) || lstatSync(source).isSymbolicLink()) {
    throw new Error("Missing or symlinked Action source directory: " + source);
  }
  if (outputDir === source || source.startsWith(outputDir + "/") || outputDir.startsWith(source + "/")) {
    throw new Error("Vite output overlaps an Action source directory: " + source);
  }
}
for (const dir of [actionsDir, outputDir]) {
  if (existsSync(dir) && lstatSync(dir).isSymbolicLink()) {
    throw new Error("Refusing to write through a symlinked distribution path: " + dir);
  }
}
if (existsSync(actionsDir) && realpathSync(actionsDir) !== actionsDir) {
  throw new Error("Generated Action directory resolves outside expected path");
}

// GitHub Action JS bundles are a repository artifact, not an npm package artifact.
// Keep discovery local so npm install never depends on an unbuilt Git Vite plugin.
function entriesForActions(): Record<string, string> {
  const entries: Record<string, string> = {};
  // Only bundle JavaScript action/CLI entry points. Composite-only actions
  // execute their own source scripts and must not create unused dist bundles.
  const bundled = new Set([
    "browser-extension-publish",
    "release-draft-sync",
    "setup-workspace-tools",
    "validate-release-identity",
  ]);
  for (const dir of readdirSync(sourcesDir, { withFileTypes: true })) {
    if (!dir.isDirectory() || !bundled.has(dir.name)) continue;
    const name = dir.name;
    const source = [
      join(sourcesDir, name, "index.ts"),
      join(sourcesDir, name, name + "-cli.ts"),
    ].find((filename) => existsSync(filename));
    if (!source) throw new Error(`Missing bundled action entry: ${name}`);
    entries[name] = source;

    const metadata = join(actionsDir, name, "action.yml");
    if (existsSync(metadata)) {
      const yaml = readFileSync(metadata, "utf8");
      if (
        /using:\\s*node24/.test(yaml) &&
        !yaml.includes("../dist/" + name + ".mjs")
      ) {
        throw new Error(
          `Node action metadata must reference ../dist/${name}.mjs: ${metadata}`,
        );
      }
    }
  }
  if (Object.keys(entries).length !== bundled.size) {
    throw new Error("Missing required GitHub Action entry point");
  }
  if (!Object.keys(entries).length)
    throw new Error("No GitHub Action entries found");
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
