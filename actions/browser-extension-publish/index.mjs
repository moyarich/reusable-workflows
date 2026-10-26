import { r as Option, t as Command } from "../_assets/esm-CeeLd381.mjs";
import { dirname, join, relative, resolve } from "node:path";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import process from "node:process";
// ../cli/src/browser-extension-publish/chrome-publish.ts
/** Chrome Web Store API orchestration, independent of Commander parsing. */
async function jsonRequest(url, init) {
	const response = await fetch(url, init);
	const payload = await response.text();
	if (!response.ok) throw new Error("Store HTTP " + response.status + ": " + payload.slice(0, 1e3));
	return payload ? JSON.parse(payload) : {};
}
async function chromePublish(archive, options) {
	const client = process.env.CHROME_CLIENT_ID || "";
	const secret = process.env.CHROME_CLIENT_SECRET || "";
	const refresh = process.env.CHROME_REFRESH_TOKEN || "";
	if (![
		client,
		secret,
		refresh,
		options.publisher,
		options.extension
	].every(Boolean)) throw new Error("Chrome OAuth credentials, publisher ID, and extension ID required");
	const token = (await jsonRequest("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: client,
			client_secret: secret,
			refresh_token: refresh,
			grant_type: "refresh_token"
		})
	})).access_token;
	if (!token) throw new Error("Missing Chrome access token");
	const base = "https://chromewebstore.googleapis.com";
	const item = "/v2/publishers/" + encodeURIComponent(options.publisher) + "/items/" + encodeURIComponent(options.extension);
	const headers = { Authorization: "Bearer " + token };
	let result = await jsonRequest(base + "/upload" + item + ":upload", {
		method: "POST",
		headers: {
			...headers,
			"Content-Type": "application/zip"
		},
		body: readFileSync(archive)
	});
	let state = result.uploadState;
	for (let attempt = 0; state === "IN_PROGRESS" && attempt < 30; attempt++) {
		await new Promise((resolve) => setTimeout(resolve, 1e4));
		result = await jsonRequest(base + item + ":fetchStatus", { headers });
		state = result.lastAsyncUploadState ?? result.uploadState;
	}
	if (state !== "SUCCEEDED") throw new Error("Chrome Web Store upload failed: " + state);
	await jsonRequest(base + item + ":publish", {
		method: "POST",
		headers: {
			...headers,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({ publishType: "DEFAULT_PUBLISH" })
	});
}
// ../cli/src/browser-extension-publish/manifest-rules.ts
/** Verify extension metadata without accessing the filesystem. */
function validateManifest(manifest, registry, firefoxId = "") {
	if (typeof manifest.manifest_version !== "number" || ![2, 3].includes(manifest.manifest_version) || typeof manifest.name !== "string" || !manifest.name.trim() || typeof manifest.version !== "string" || !/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(manifest.version)) throw new Error("Invalid browser extension manifest version, name, or version");
	const gecko = manifest.browser_specific_settings?.gecko?.id ?? manifest.applications?.gecko?.id;
	if (registry !== "chrome" && !gecko) throw new Error("Firefox requires browser_specific_settings.gecko.id");
	if (firefoxId && gecko !== firefoxId) throw new Error("Firefox ID does not match manifest");
	return {
		version: manifest.version,
		name: manifest.name
	};
}
// ../cli/src/browser-extension-publish/manifest.ts
/** Public store API. */
/** Public safe dir API. */
function safeDir(value) {
	const root = process.cwd();
	const absolute = resolve(root, value);
	const rel = relative(root, absolute);
	if (rel === ".." || rel.startsWith("../") || rel.startsWith("..\\") || rel.startsWith("/")) throw new Error("Directory must be inside the workspace");
	return absolute;
}
/** Public validate API. */
function validate(directory, registry, firefoxId = "") {
	const dir = safeDir(directory);
	return {
		dir,
		...validateManifest(JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")), registry, firefoxId)
	};
}
// ../cli/src/browser-extension-publish/firefox-publish.ts
/** Firefox Add-ons signing and submission service, independent of Commander. */
/** Validate an extension and submit it to Firefox Add-ons for signing. */
function firefoxPublish(buildDirectory, outputDirectory = "firefox-signed") {
	const key = process.env.FIREFOX_API_KEY;
	const secret = process.env.FIREFOX_API_SECRET;
	if (!key || !secret) throw new Error("Firefox API credentials required");
	validate(buildDirectory, "firefox");
	const output = safeDir(outputDirectory);
	mkdirSync(output, { recursive: true });
	execFileSync("npm", [
		"exec",
		"--yes",
		"--package=web-ext",
		"--",
		"web-ext",
		"sign",
		"--source-dir",
		safeDir(buildDirectory),
		"--artifacts-dir",
		output,
		"--channel",
		"listed",
		"--api-key",
		key,
		"--api-secret",
		secret
	], { stdio: "inherit" });
}
// ../cli/src/browser-extension-publish/package-extension.ts
/** ZIP packaging service for browser extension distribution. */
/** Package an extension directory and verify its ZIP archive. */
function packageExtension(buildDirectory, destination = "extension.zip") {
	const directory = safeDir(buildDirectory);
	readFileSync(join(directory, "manifest.json"));
	const output = resolve(process.cwd(), destination);
	if (existsSync(output)) throw new Error("Output already exists: " + output);
	mkdirSync(dirname(output), { recursive: true });
	execFileSync("zip", [
		"-q",
		"-r",
		output,
		"."
	], { cwd: directory });
	execFileSync("unzip", ["-t", output], { stdio: "ignore" });
	return output;
}
// ../cli/src/browser-extension-publish/browser-extension-publish-cli.ts
/** Commander-powered CLI command and feature implementation. @module */
var STORES = [
	"chrome",
	"firefox",
	"all"
];
/** Build the browser extension command tree without executing it. */
function createBrowserExtensionProgram() {
	const program = new Command().name("browser-extension-publish").description("Validate, package and submit Chrome/Firefox browser extensions");
	program.command("validate").requiredOption("--build-directory <dir>", "built extension directory").addOption(new Option("--registry <store>", STORES.join(" | ")).choices(STORES).default("all")).option("--firefox-addon-id <id>", "Expected Gecko extension ID", "").action((opts) => {
		const result = validate(opts.buildDirectory, opts.registry, opts.firefoxAddonId);
		if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `version=${result.version}\n`);
		console.log(JSON.stringify({
			name: result.name,
			version: result.version
		}));
	});
	program.command("package").requiredOption("--build-directory <dir>", "built extension directory").option("--output <zip>", "Archive destination", "extension.zip").action((opts) => {
		const output = packageExtension(opts.buildDirectory, opts.output);
		console.log(`Packaged ${output}`);
	});
	program.command("publish-chrome").requiredOption("--archive <zip>", "extension archive to upload").requiredOption("--publisher-id <id>", "Chrome Web Store publisher ID").requiredOption("--extension-id <id>", "Chrome Web Store extension ID").action(async (opts) => {
		await chromePublish(resolve(opts.archive), {
			publisher: opts.publisherId,
			extension: opts.extensionId
		});
		console.log("Chrome Web Store publication submitted");
	});
	program.command("publish-firefox").requiredOption("--build-directory <dir>", "built extension directory").option("--output-directory <dir>", "Signed artifact directory", "firefox-signed").action(async (opts) => {
		await firefoxPublish(opts.buildDirectory, opts.outputDirectory);
		console.log("Firefox Add-ons submission completed");
	});
	return program;
}
/** Invoke the browser extension CLI explicitly. */
async function runBrowserExtensionCli(argv = process.argv) {
	await createBrowserExtensionProgram().parseAsync(argv);
}
// ../cli/src/browser-extension-publish/action-entry.ts
/** Executable browser-extension action entry point. */
await runBrowserExtensionCli();
export {};
