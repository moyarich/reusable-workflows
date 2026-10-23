import type { Manifest } from "./workspace-rules.js";
import { globRegex } from "./workspace-rules.js";
import { resolveWorkspaceManifests } from "./resolve-manifests.js";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const fields: Field[] = [
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
];
const read = async (file: string): Promise<Manifest> =>
  JSON.parse(await readFile(file, "utf8")) as Manifest;
const slash = (value: string) => value.split(path.sep).join("/");
async function manifests(root: string, patterns: string[]) {
  const found: Array<{ directory: string; absolute: string }> = [];
  async function walk(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (
        !entry.isDirectory() ||
        ["node_modules", ".git", ".publish", "dist"].includes(entry.name)
      )
        continue;
      const full = path.join(dir, entry.name);
      const relative = slash(path.relative(root, full));
      if (
        patterns.some((p) =>
          globRegex(p.replace(/^\.\//, "").replace(/\/$/, "")).test(relative),
        )
      ) {
        try {
          await read(path.join(full, "package.json"));
          found.push({ directory: relative, absolute: full });
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
      }
      await walk(full);
    }
  }
  await walk(root);
  return found;
}
export async function resolveWorkspaces({
  cwd = process.cwd(),
  packageSelector = "all",
  range = "caret",
  write = false,
  output = "resolve-workspaces.json",
}: {
  cwd?: string;
  packageSelector?: string;
  range?: string;
  write?: boolean;
  output?: string;
} = {}) {
  if (!["caret", "exact", "tilde"].includes(range))
    throw new Error("Invalid range: " + range);
  const root = path.resolve(cwd);
  const rootPkg = await read(path.join(root, "package.json"));
  const patterns = Array.isArray(rootPkg.workspaces)
    ? rootPkg.workspaces
    : rootPkg.workspaces?.packages;
  if (!Array.isArray(patterns)) throw new Error("No npm workspaces declared");
  const dirs = await manifests(
    root,
    patterns.filter((p) => !p.startsWith("!")),
  );
  const all = await Promise.all(
    dirs.map(async (item) => ({
      ...item,
      pkg: await read(path.join(item.absolute, "package.json")),
    })),
  );
  const { result, graph, batches } = resolveWorkspaceManifests(
    all,
    packageSelector,
    range,
  );
  if (write) {
    // Write only after validation completes.
    for (const item of result)
      if (item.changes.length)
        await writeFile(
          path.join(item.absolute, "package.json"),
          JSON.stringify(item.manifest, null, 2) + "\n",
        );
  }
  const report = {
    valid: true,
    selector: packageSelector,
    range,
    modified: write,
    summary: {
      workspaces: result.length,
      publishable: graph.length,
      dependenciesResolved: result.reduce((n, p) => n + p.changes.length, 0),
      batches: batches.length,
    },
    packages: result.map((item) => {
      const { absolute: _absolute, manifest: _manifest, ...publicItem } = item;
      return publicItem;
    }),
    publish: {
      order: batches.flat(),
      batches: batches.map((packages, level) => ({ level, packages })),
    },
  };
  if (output) {
    const destination = path.resolve(root, output);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, JSON.stringify(report, null, 2) + "\n");
  }
  return report;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname)
) {
  const args = Object.fromEntries(
    process.argv
      .slice(2)
      .filter((a) => a.startsWith("--") && a.includes("="))
      .map((a) => {
        const i = a.indexOf("=");
        return [a.slice(2, i), a.slice(i + 1)];
      }),
  );
  resolveWorkspaces({
    cwd: args.cwd ?? process.cwd(),
    packageSelector: args.package ?? "all",
    range: args.range ?? "caret",
    output: args.output ?? "resolve-workspaces.json",
    write: process.argv.includes("--write"),
  })
    .then((report) => console.log(JSON.stringify(report, null, 2)))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
