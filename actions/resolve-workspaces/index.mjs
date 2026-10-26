import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
// ../cli/src/resolve-workspaces/workspace-rules.ts
function globRegex(glob) {
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
		else pattern += (/* @__PURE__ */ new Set([
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
			"\\"
		])).has(c) ? "\\" + c : c;
	}
	return new RegExp(pattern + "$");
}
function batchesFor(packages) {
	const remaining = new Map(packages.map((p) => [p.name, new Set(p.dependencies.filter((d) => d.publishDependency).map((d) => d.name))]));
	const waves = [];
	while (remaining.size) {
		const ready = [...remaining].filter(([, deps]) => deps.size === 0).map(([name]) => name).sort();
		if (!ready.length) throw new Error("Workspace publish dependency cycle: " + [...remaining.keys()].join(", "));
		waves.push(ready);
		for (const name of ready) remaining.delete(name);
		for (const deps of remaining.values()) for (const name of ready) deps.delete(name);
	}
	return waves;
}
// ../cli/src/resolve-workspaces/resolve-manifests.ts
var fields = [
	"dependencies",
	"optionalDependencies",
	"peerDependencies"
];
function resolveWorkspaceManifests(all, packageSelector, range) {
	if (![
		"caret",
		"exact",
		"tilde"
	].includes(range)) throw new Error("Invalid range: " + range);
	const byName = /* @__PURE__ */ new Map();
	for (const item of all) {
		if (!item.pkg.name || !item.pkg.version) throw new Error("Missing name or version: " + item.directory);
		if (byName.has(item.pkg.name)) throw new Error("Duplicate workspace name: " + item.pkg.name);
		byName.set(item.pkg.name, item);
	}
	const chosen = packageSelector === "all" ? all : all.filter((item) => item.pkg.name === packageSelector || item.directory === packageSelector.replace(/\/$/, ""));
	if (!chosen.length) throw new Error("Unknown workspace selector: " + packageSelector);
	const selected = new Set(chosen.map((item) => item.pkg.name));
	function include(name) {
		const item = byName.get(name);
		if (!item) throw new Error("Unknown workspace: " + name);
		for (const field of ["dependencies", "optionalDependencies"]) for (const dep of Object.keys(item.pkg[field] ?? {})) {
			if (!byName.has(dep) || selected.has(dep)) continue;
			selected.add(dep);
			include(dep);
		}
	}
	for (const item of chosen) include(item.pkg.name);
	const result = [];
	for (const item of all.filter((x) => selected.has(x.pkg.name))) {
		const next = structuredClone(item.pkg);
		const dependencies = [], changes = [];
		for (const field of fields) for (const [name, spec] of Object.entries(next[field] ?? {})) {
			const local = byName.get(name);
			if (!local) continue;
			const version = local.pkg.version;
			const resolved = range === "exact" ? version : (range === "caret" ? "^" : "~") + version;
			if (spec === "*" || spec === "x" || spec === "X") {
				(next[field] ??= {})[name] = resolved;
				changes.push({
					field,
					name,
					from: spec,
					to: resolved
				});
			}
			dependencies.push({
				name,
				field,
				original: spec,
				resolved: next[field]?.[name] ?? spec,
				version,
				publishDependency: field !== "peerDependencies" && selected.has(name)
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
			absolute: item.absolute
		});
	}
	const graph = result.filter((p) => p.publishable);
	const graphNames = new Set(graph.map((p) => p.name));
	for (const item of graph) for (const dep of item.dependencies) if (dep.publishDependency && !graphNames.has(dep.name)) throw new Error(item.name + " depends on private/unselected package " + dep.name);
	return {
		result,
		graph,
		batches: batchesFor(graph)
	};
}
// ../cli/src/resolve-workspaces/index.ts
var read = async (file) => JSON.parse(await readFile(file, "utf8"));
var slash = (value) => value.split(path.sep).join("/");
async function manifests(root, patterns) {
	const found = [];
	async function walk(dir) {
		for (const entry of await readdir(dir, { withFileTypes: true })) {
			if (!entry.isDirectory() || [
				"node_modules",
				".git",
				".publish",
				"dist"
			].includes(entry.name)) continue;
			const full = path.join(dir, entry.name);
			const relative = slash(path.relative(root, full));
			if (patterns.some((p) => globRegex(p.replace(/^\.\//, "").replace(/\/$/, "")).test(relative))) try {
				await read(path.join(full, "package.json"));
				found.push({
					directory: relative,
					absolute: full
				});
			} catch (error) {
				if (error.code !== "ENOENT") throw error;
			}
			await walk(full);
		}
	}
	await walk(root);
	return found;
}
async function resolveWorkspaces({ cwd = process.cwd(), packageSelector = "all", range = "caret", write = false, output = "resolve-workspaces.json" } = {}) {
	if (![
		"caret",
		"exact",
		"tilde"
	].includes(range)) throw new Error("Invalid range: " + range);
	const root = path.resolve(cwd);
	const rootPkg = await read(path.join(root, "package.json"));
	const patterns = Array.isArray(rootPkg.workspaces) ? rootPkg.workspaces : rootPkg.workspaces?.packages;
	if (!Array.isArray(patterns)) throw new Error("No npm workspaces declared");
	const dirs = await manifests(root, patterns.filter((p) => !p.startsWith("!")));
	const { result, graph, batches } = resolveWorkspaceManifests(await Promise.all(dirs.map(async (item) => ({
		...item,
		pkg: await read(path.join(item.absolute, "package.json"))
	}))), packageSelector, range);
	if (write) {
		for (const item of result) if (item.changes.length) await writeFile(path.join(item.absolute, "package.json"), JSON.stringify(item.manifest, null, 2) + "\n");
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
			batches: batches.length
		},
		packages: result.map(({ name, version, directory, private: isPrivate, publishable, dependencies, changes }) => ({
			name,
			version,
			directory,
			private: isPrivate,
			publishable,
			dependencies,
			changes
		})),
		publish: {
			order: batches.flat(),
			batches: batches.map((packages, level) => ({
				level,
				packages
			}))
		}
	};
	if (output) {
		const destination = path.resolve(root, output);
		await mkdir(path.dirname(destination), { recursive: true });
		await writeFile(destination, JSON.stringify(report, null, 2) + "\n");
	}
	return report;
}
async function runResolveWorkspacesAction() {
	const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith("--") && a.includes("=")).map((a) => {
		const i = a.indexOf("=");
		return [a.slice(2, i), a.slice(i + 1)];
	}));
	await resolveWorkspaces({
		cwd: args.cwd ?? process.cwd(),
		packageSelector: args.package ?? "all",
		range: args.range ?? "caret",
		output: args.output ?? "resolve-workspaces.json",
		write: process.argv.includes("--write")
	}).then((report) => console.log(JSON.stringify(report, null, 2))).catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}
// ../cli/src/resolve-workspaces/action-entry.ts
await runResolveWorkspacesAction();
export {};
