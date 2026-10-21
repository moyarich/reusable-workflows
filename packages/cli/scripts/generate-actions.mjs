import {
  cpSync,
  existsSync,
  mkdirSync,
  lstatSync,
  realpathSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageRoot, "../..");
const sourceRoot = join(packageRoot, "actions");
const outputRoot = join(repositoryRoot, "actions");
const bundledRoot = join(outputRoot, ".bundles");
const bundles = new Map([
  ["browser-extension-publish", "browser-extension-publish/index.mjs"],
  ["release-draft-sync", "release-draft-sync/index.mjs"],
  ["setup-workspace-tools", "setup-workspace-tools/index.mjs"],
  ["validate-release-identity", "validate-release-identity/index.mjs"],
]);

// Composite actions ship their runtime dependencies beside action.yml.
// Referencing packages/cli/src in a published action is not portable.
const runtimeFiles = {
  "check-dist": {
    "select.mjs": "packages/cli/src/check-dist/select.mjs",
    "config.schema.json":
      "reusable-configurations/check-dist-config.schema.json",
  },
  "resolve-workspaces": {
    "index.mjs": "packages/cli/src/resolve-workspaces/index.mjs",
  },
  "workflow-dispatch": {
    "index.mjs": "packages/cli/src/workflow-dispatch/workflow-dispatch.mjs",
  },
  "verify-workflow-runs": {
    "index.mjs": "packages/cli/src/verify-workflow-runs/index.mjs",
  },
};

// Refuse unexpected paths before doing any destructive work. Only the repository
// root actions/ directory may be replaced; authored sources are read-only.
const expectedOutput = resolve(repositoryRoot, "actions");
if (
  resolve(outputRoot) !== expectedOutput ||
  resolve(outputRoot) === resolve(sourceRoot)
) {
  throw new Error("Unsafe generated actions output directory");
}
for (const protectedPath of [repositoryRoot, packageRoot, sourceRoot]) {
  if (!existsSync(protectedPath) || lstatSync(protectedPath).isSymbolicLink()) {
    throw new Error("Missing or symlinked source directory: " + protectedPath);
  }
}
if (existsSync(outputRoot) && lstatSync(outputRoot).isSymbolicLink()) {
  throw new Error("Refusing to modify symlinked generated actions directory");
}
if (realpathSync(sourceRoot).startsWith(expectedOutput + "/")) {
  throw new Error(
    "Action source directory must be outside generated distribution",
  );
}
for (const [name, files] of Object.entries(runtimeFiles)) {
  for (const source of Object.values(files)) {
    const file = resolve(repositoryRoot, source);
    if (
      !file.startsWith(realpathSync(repositoryRoot) + "/") ||
      !existsSync(file) ||
      lstatSync(file).isSymbolicLink() ||
      !realpathSync(file).startsWith(realpathSync(repositoryRoot) + "/")
    ) {
      throw new Error("Unsafe runtime source for " + name + ": " + source);
    }
  }
}

if (!existsSync(sourceRoot))
  throw new Error(`Missing action sources: ${sourceRoot}`);
if (!existsSync(bundledRoot))
  throw new Error("Build JavaScript bundles before generating actions");
const actionNames = readdirSync(sourceRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
if (!actionNames.length) throw new Error("No source actions found");

// Root actions/ is fully generated. Preserve Vite action bundles in dist/.
for (const entry of readdirSync(outputRoot, { withFileTypes: true })) {
  if (
    entry.isDirectory() &&
    entry.name !== ".bundles" &&
    !actionNames.includes(entry.name)
  ) {
    rmSync(join(outputRoot, entry.name), { recursive: true, force: true });
  }
}
for (const name of actionNames) {
  if (!/^[a-z][a-z0-9-]*$/.test(name))
    throw new Error(`Invalid action name: ${name}`);
  const sourceDir = join(sourceRoot, name);
  if (lstatSync(sourceDir).isSymbolicLink()) {
    throw new Error("Refusing symlinked action source: " + name);
  }
  const outputDir = join(outputRoot, name);
  if (!existsSync(join(sourceDir, "action.yml")))
    throw new Error(`Missing action.yml: ${name}`);
  if (existsSync(outputDir) && lstatSync(outputDir).isSymbolicLink()) {
    throw new Error("Refusing symlinked generated action: " + name);
  }
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });
  cpSync(sourceDir, outputDir, {
    recursive: true,
    filter: (source) => {
      if (lstatSync(source).isSymbolicLink()) {
        throw new Error("Refusing symlink inside action sources: " + source);
      }
      return true;
    },
  });
  const bundle = bundles.get(name);
  if (bundle) {
    const bundledFile = join(bundledRoot, bundle);
    if (!existsSync(bundledFile)) throw new Error(`Missing Vite bundle: ${bundledFile}`);
    cpSync(bundledFile, join(outputDir, "index.mjs"));
  }
  for (const [target, source] of Object.entries(runtimeFiles[name] ?? {})) {
    const sourceFile = resolve(repositoryRoot, source);
    if (!existsSync(sourceFile))
      throw new Error(`Missing action runtime: ${source}`);
    cpSync(sourceFile, join(outputDir, target));
  }
  const actionFile = join(outputDir, "action.yml");
  const metadata = readFileSync(actionFile, "utf8");
  if (
    metadata.includes("packages/cli/src/") ||
    metadata.includes("../../src/")
  ) {
    throw new Error(`Generated action references source tree: ${name}`);
  }
  const nodeRuntime = /^\s*using:\s*node24\s*$/m.test(metadata);
  const compositeRuntime = /^\s*using:\s*composite\s*$/m.test(metadata);
  if (!nodeRuntime && !compositeRuntime)
    throw new Error(`Unsupported action runtime: ${name}`);
  if (nodeRuntime) {
    const entry = metadata.match(/^\s*main:\s*([^\s#]+)\s*$/m)?.[1];
    if (!entry || !existsSync(resolve(outputDir, entry)))
      throw new Error(`Invalid node24 bundle for ${name}: ${entry}`);
  }
  for (const match of metadata.matchAll(/\$GITHUB_ACTION_PATH\/([\w.\/-]+)/g)) {
    const script = resolve(outputDir, match[1]);
    if (!script.startsWith(outputDir + "/") || !existsSync(script)) {
      throw new Error(`Unresolvable composite runtime in ${name}: ${match[0]}`);
    }
  }
}
// Staging is disposable. Public bundles must be next to each action.yml.
rmSync(bundledRoot, { recursive: true, force: true });
console.log(`Generated ${actionNames.length} self-contained GitHub Actions in actions/`);
