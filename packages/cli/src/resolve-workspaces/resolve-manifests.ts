/** Pure workspace dependency resolution and manifest transformations. */
import type {
  Workspace,
  Field,
  ResultPackage,
  Dependency,
  Change,
} from "./workspace-rules.js";
import { batchesFor } from "./workspace-rules.js";
const fields: Field[] = [
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
];

export function resolveWorkspaceManifests(
  all: Workspace[],
  packageSelector: string,
  range: string,
) {
  if (!["caret", "exact", "tilde"].includes(range))
    throw new Error("Invalid range: " + range);
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
    if (!item) throw new Error("Unknown workspace: " + name);
    for (const field of ["dependencies", "optionalDependencies"] as Field[]) {
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
  return { result, graph, batches };
}
