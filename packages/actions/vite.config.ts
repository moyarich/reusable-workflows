import { actionDistributions } from "./plugins/action-distributions";
import { existsSync, lstatSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const packageRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(packageRoot, "../..");
const sourceRoot = resolve(packageRoot, "../cli/src");
const metadataRoot = resolve(packageRoot, "actions");
const generatedRoot = resolve(repositoryRoot, "actions");
const stagingRoot = resolve(packageRoot, "dist/.bundles");

const entries: Record<string, string> = {
  "browser-extension-publish": "browser-extension-publish/entry.ts",
  "release-draft-sync": "release-draft-sync/index.ts",
  "setup-workspace-tools": "setup-workspace-tools/action-entry.ts",
  "validate-release-identity": "validate-release-identity/index.ts",
};

const inputs = Object.fromEntries(
  Object.entries(entries).map(([name, file]) => {
    const source = resolve(sourceRoot, file);
    if (!existsSync(source)) throw new Error("Missing action entry: " + source);
    return [name, source];
  }),
);
for (const protectedDir of [sourceRoot, metadataRoot]) {
  if (
    !existsSync(protectedDir) ||
    lstatSync(protectedDir).isSymbolicLink() ||
    stagingRoot === protectedDir ||
    stagingRoot.startsWith(protectedDir + "/")
  ) {
    throw new Error("Unsafe Vite output overlapping sources: " + protectedDir);
  }
}
for (const dir of [generatedRoot, stagingRoot]) {
  if (existsSync(dir) && lstatSync(dir).isSymbolicLink()) {
    throw new Error("Refusing symlinked action distribution: " + dir);
  }
}
if (
  existsSync(generatedRoot) &&
  realpathSync(generatedRoot) !== generatedRoot
) {
  throw new Error("Generated Action root resolves outside repository");
}

export default defineConfig({
  plugins: [actionDistributions()],
  ssr: { noExternal: true },
  build: {
    ssr: true,
    target: "node24",
    outDir: stagingRoot,
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: inputs,
      output: {
        entryFileNames: "[name]/index.mjs",
        chunkFileNames: "_assets/[name]-[hash].mjs",
        assetFileNames: "_assets/[name]-[hash][extname]",
      },
    },
  },
});
