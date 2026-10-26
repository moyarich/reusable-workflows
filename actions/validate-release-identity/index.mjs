import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import process$1 from "node:process";
// ../cli/src/release-draft-sync/identity.ts
var versionedMarker = /<!--\s*release-draft-sync:(v\d+)\b([\s\S]*?)-->/g;
var legacyTarget = /<!--\s*release-draft-sync:target=([^\s>]+)\s*-->/;
var legacySeed = /<!--\s*release-draft-sync:seed-sha=([^\s>]+)(?:\s+source=([^\s>]+))?\s*-->/;
var fields = [
	"package",
	"version",
	"tag",
	"target",
	"seed-sha",
	"source"
];
function parseV2(content) {
	const data = {};
	for (const line of content.trim().split("\n")) {
		const at = line.indexOf("=");
		if (at < 1) throw new Error("Invalid release identity field: " + line);
		const key = line.slice(0, at), value = line.slice(at + 1);
		if (!fields.includes(key) || key in data || !value) throw new Error("Invalid or duplicate identity field: " + key);
		data[key] = value;
	}
	for (const key of fields.slice(0, 4)) if (!data[key]) throw new Error("Missing release identity field: " + key);
	return {
		format: "v2",
		...data
	};
}
function parseLegacy(body) {
	const target = body.match(legacyTarget)?.[1];
	const seed = body.match(legacySeed);
	return target || seed ? {
		format: "legacy",
		target,
		"seed-sha": seed?.[1],
		source: seed?.[2]
	} : null;
}
var parsers = { v2: parseV2 };
/** Parse the canonical or legacy identity marker from release notes. */
function parseReleaseMarker(body = "") {
	const matches = [...body.matchAll(versionedMarker)];
	if (matches.length > 1) throw new Error("Multiple release identity markers found.");
	if (matches.length === 1) {
		const [, version, content] = matches[0];
		const parser = parsers[version];
		if (!parser) throw new Error("Unsupported release identity marker version: " + version);
		return parser(content);
	}
	return parseLegacy(body);
}
/** Validate release identity against expected metadata. */
function validateReleaseMarker(body, expected) {
	const marker = parseReleaseMarker(body);
	if (!marker) return { format: "none" };
	if (marker.format === "v2") for (const key of [
		"package",
		"version",
		"tag",
		"target"
	]) {
		const field = key;
		if (expected[field] && marker[field] !== expected[field]) throw new Error(`Release identity mismatch for ${key}: marker=${marker[field]} expected=${expected[field]}`);
	}
	else if (expected.target && marker.target && marker.target !== expected.target && marker.target !== expected.package) throw new Error("Legacy release target mismatch: " + marker.target);
	return marker;
}
// ../cli/src/validate-release-identity/release-lookup.ts
function findReleaseByTag(raw, tag) {
	const pages = JSON.parse(raw);
	if (!Array.isArray(pages)) throw new Error("GitHub releases response must be an array");
	return pages.flat().find((value) => value !== null && typeof value === "object" && value.tag_name === tag);
}
// ../cli/src/validate-release-identity/index.ts
/** GitHub release identity validation action adapter. */
var input = (name) => {
	const key = "INPUT_" + name.toUpperCase();
	return process$1.env[key] ?? process$1.env[key.replaceAll("-", "_")] ?? "";
};
/** Run identity validation using GitHub CLI and GitHub Actions outputs. */
function runAction() {
	const tag = input("release-tag");
	if (!tag) throw new Error("release-tag is required");
	const repository = process$1.env.GITHUB_REPOSITORY;
	if (!repository || !/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error("Invalid GitHub repository");
	const release = findReleaseByTag(execFileSync("gh", [
		"api",
		"--paginate",
		"--slurp",
		"repos/" + repository + "/releases?per_page=100"
	], { encoding: "utf8" }), tag);
	if (!release) {
		if (input("required") === "true") throw new Error("No GitHub Release for tag: " + tag);
		console.log("No release exists for tag " + tag + "; skipping marker validation.");
		return;
	}
	const marker = validateReleaseMarker(release.body || "", {
		tag,
		package: input("package-name"),
		version: input("version"),
		target: input("target")
	});
	console.log("Release " + tag + " metadata format: " + marker.format);
	if (process$1.env.GITHUB_OUTPUT) appendFileSync(process$1.env.GITHUB_OUTPUT, "format=" + marker.format + "\n");
}
// ../cli/src/validate-release-identity/action-entry.ts
/** Executable entrypoint for release identity validation action. */
try {
	runAction();
} catch (error) {
	console.error("::error::" + (error instanceof Error ? error.message : String(error)));
	process.exitCode = 1;
}
export {};
