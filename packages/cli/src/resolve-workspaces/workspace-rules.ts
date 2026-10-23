/** Pure workspace matching and publish dependency ordering. */
export type Manifest = {
  name: string;
  version: string;
  private?: boolean;
  workspaces?: string[] | { packages: string[] };
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};
export type Field = "dependencies" | "optionalDependencies" | "peerDependencies";
export type Workspace = { directory: string; absolute: string; pkg: Manifest };
export type Dependency = {
  name: string;
  field: Field;
  original: string;
  resolved: string;
  version: string;
  publishDependency: boolean;
};
export type Change = { field: Field; name: string; from: string; to: string };
export type ResultPackage = {
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

export function globRegex(glob: string) {
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

export function batchesFor(packages: ResultPackage[]) {
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
