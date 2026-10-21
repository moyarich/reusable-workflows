import { existsSync, lstatSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const packageRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(packageRoot, "../..");
const sourceRoot = resolve(packageRoot, "src");
const metadataRoot = resolve(packageRoot, "actions");
const generatedRoot = resolve(repositoryRoot, "actions");
const stagingRoot = resolve(generatedRoot, ".bundles");

const entries: Record<string, string> = {
  "browser-extension-publish":
    "browser-extension-publish/browser-extension-publish-cli.ts",
  "release-draft-sync": "release-draft-sync/index.ts",
  "setup-workspace-tools": "setup-workspace-tools/setup-workspace-tools-cli.ts",
  "validate-release-identity": "validate-release-identity/index.ts",
};

export default defineConfig(({ mode }) => {
  const entry = entries[mode];
  if (!entry) throw new Error("Unknown action bundle: " + mode);
  const source = resolve(sourceRoot, entry);
  const output = resolve(stagingRoot, mode);
  if (!existsSync(source) || !existsSync(metadataRoot))
    throw new Error("Missing authored action source: " + mode);
  for (const protectedDir of [sourceRoot, metadataRoot]) {
    if (
      lstatSync(protectedDir).isSymbolicLink() ||
      output === protectedDir ||
      output.startsWith(protectedDir + "/") ||
      protectedDir.startsWith(output + "/")
    ) {
      throw new Error("Vite output overlaps protected source: " + protectedDir);
    }
  }
  for (const dir of [generatedRoot, stagingRoot, output]) {
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
  return {
    ssr: { noExternal: true },
    build: {
      ssr: source,
      target: "node24",
      outDir: output,
      emptyOutDir: true,
      minify: false,
      rollupOptions: {
        output: {
          entryFileNames: "index.mjs",
          chunkFileNames: "chunks/[name]-[hash].mjs",
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
    },
  };
});
