export function globRegex(glob) {
    let pattern = "^";
    for (let i = 0; i < glob.length; i++) {
        const c = glob[i];
        if (c === "*") {
            if (glob[i + 1] === "*") {
                i++;
                if (glob[i + 1] === "/") {
                    i++;
                    pattern += "(?:.*/)?";
                }
                else
                    pattern += ".*";
            }
            else
                pattern += "[^/]*";
        }
        else if (c === "?")
            pattern += "[^/]";
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
export function batchesFor(packages) {
    const remaining = new Map(packages.map((p) => [
        p.name,
        new Set(p.dependencies.filter((d) => d.publishDependency).map((d) => d.name)),
    ]));
    const waves = [];
    while (remaining.size) {
        const ready = [...remaining]
            .filter(([, deps]) => deps.size === 0)
            .map(([name]) => name)
            .sort();
        if (!ready.length)
            throw new Error("Workspace publish dependency cycle: " +
                [...remaining.keys()].join(", "));
        waves.push(ready);
        for (const name of ready)
            remaining.delete(name);
        for (const deps of remaining.values())
            for (const name of ready)
                deps.delete(name);
    }
    return waves;
}
