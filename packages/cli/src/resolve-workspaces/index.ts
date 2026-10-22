import type { ErrnoException } from "node:util";
type Manifest = {
  name: string;
  version: string;
  private?: boolean;
  workspaces?: string[] | { packages: string[] };
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};
type Field = "dependencies" | "optionalDependencies" | "peerDependencies";
type Workspace = { directory: string; absolute: string; pkg: Manifest };
type Dependency = {
  name: string;
  field: Field;
  original: string;
  resolved: string;
  version: string;
  publishDependency: boolean;
};
type Change = { field: Field; name: string; from: string; to: string };
type ResultPackage = {
  name: string;
  version: string;
  directory: string;
  private: boolean;
  publishable: boolean;
  dependencies: Dependency[];
  changes: Change[];
  manifest: Manifest;
  absolute: string;
};
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
function globRegex(glob: string) {
  let pattern = "^";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        i++;
        if (glob[i + 1] === "/") {
          i++;
          pattern += "(?:.*/)?";
        } else pattern += ".*";
      } else pattern += "[^/]*";
    } else if (c === "?") pattern += "[^/]";
    else
      pattern += new Set([
        ".",
        "+",
        "^",
        "$",
        "(",
        ")",
        "{",
        "}",
        "|",
        "[",
        "]",
        "\\",
      ]).has(c)
        ? "\\" + c
        : c;
  }
  return new RegExp(pattern + "$");
}
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
function batchesFor(packages: ResultPackage[]) {
  const remaining = new Map(
    packages.map((p) => [
      p.name,
      new Set(
        p.dependencies.filter((d) => d.publishDependency).map((d) => d.name),
      ),
    ]),
  );
  const waves: string[][] = [];
  while (remaining.size) {
    const ready = [...remaining]
      .filter(([, deps]) => deps.size === 0)
      .map(([name]) => name)
      .sort();
    if (!ready.length)
      throw new Error(
        "Workspace publish dependency cycle: " +
          [...remaining.keys()].join(", "),
      );
    waves.push(ready);
    for (const name of ready) remaining.delete(name);
    for (const deps of remaining.values())
      for (const name of ready) deps.delete(name);
  }
  return waves;
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
  const byName = new Map<string, Workspace>();
  for (const item of all) {
    if (!item.pkg.name || !item.pkg.version)
      throw new Error("Missing name or version: " + item.directory);
    if (byName.has(item.pkg.name))
      throw new Error("Duplicate workspace name: " + item.pkg.name);
    byName.set(item.pkg.name, item);
  }
  const chosen =
    packageSelector === "all"
      ? all
      : all.filter(
          (item) =>
            item.pkg.name === packageSelector ||
            item.directory === packageSelector.replace(/\/$/, ""),
        );
  if (!chosen.length)
    throw new Error("Unknown workspace selector: " + packageSelector);
  const selected = new Set(chosen.map((item) => item.pkg.name));
  function include(name: string) {
    const item = byName.get(name);
    for (const field of ["dependencies", "optionalDependencies"]) {
      for (const dep of Object.keys(item.pkg[field] ?? {})) {
        if (!byName.has(dep) || selected.has(dep)) continue;
        selected.add(dep);
        include(dep);
      }
    }
  }
  for (const item of chosen) include(item.pkg.name);
  const result: ResultPackage[] = [];
  for (const item of all.filter((x) => selected.has(x.pkg.name))) {
    const next = structuredClone(item.pkg);
    const dependencies: Dependency[] = [],
      changes: Change[] = [];
    for (const field of fields)
      for (const [name, spec] of Object.entries(next[field] ?? {})) {
        const local = byName.get(name);
        if (!local) continue;
        const version = local.pkg.version;
        const resolved =
          range === "exact"
            ? version
            : (range === "caret" ? "^" : "~") + version;
        // Preserve intentional constraints. Only rewrite broad local wildcards.
        if (spec === "*" || spec === "x" || spec === "X") {
          (next[field] ??= {})[name] = resolved;
          changes.push({ field, name, from: spec, to: resolved });
        }
        dependencies.push({
          name,
          field,
          original: spec,
          resolved: next[field]?.[name] ?? spec,
          version,
          publishDependency: field !== "peerDependencies" && selected.has(name),
        });
      }
    result.push({
      name: item.pkg.name,
      version: item.pkg.version,
      directory: item.directory,
      private: item.pkg.private === true,
      publishable: item.pkg.private !== true,
      dependencies,
      changes,
      manifest: next,
      absolute: item.absolute,
    });
  }
  const graph = result.filter((p) => p.publishable);
  const graphNames = new Set(graph.map((p) => p.name));
  for (const item of graph)
    for (const dep of item.dependencies) {
      if (dep.publishDependency && !graphNames.has(dep.name))
        throw new Error(
          item.name + " depends on private/unselected package " + dep.name,
        );
    }
  const batches = batchesFor(graph);
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
