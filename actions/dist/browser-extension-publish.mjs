import { C as Command, I as InvalidArgumentError } from "./assets/esm-CXOORIl-.js";
import { readFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { execFileSync } from "node:child_process";
import process from "node:process";
import "node:events";
function safeDir(value) {
  const root = process.cwd();
  const absolute = resolve(root, value);
  const rel = relative(root, absolute);
  if (rel === ".." || rel.startsWith("../") || rel.startsWith("..\\") || rel.startsWith("/"))
    throw new Error("Directory must be inside the workspace");
  return absolute;
}
function validate(directory, registry, firefoxId = "") {
  const dir = safeDir(directory);
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  if (![2, 3].includes(manifest.manifest_version) || typeof manifest.name !== "string" || !manifest.name.trim() || !/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(manifest.version))
    throw new Error(
      "Invalid browser extension manifest version, name, or version"
    );
  const gecko = manifest.browser_specific_settings?.gecko?.id ?? manifest.applications?.gecko?.id;
  if (registry !== "chrome" && !gecko)
    throw new Error("Firefox requires browser_specific_settings.gecko.id");
  if (firefoxId && gecko !== firefoxId)
    throw new Error("Firefox ID does not match manifest");
  return {
    dir,
    version: manifest.version,
    name: manifest.name
  };
}
const store = (value) => {
  if (!["chrome", "firefox", "all"].includes(value))
    throw new InvalidArgumentError("registry must be chrome, firefox, or all");
  return value;
};
async function jsonRequest(url, init) {
  const response = await fetch(url, init);
  const payload = await response.text();
  if (!response.ok)
    throw new Error(
      "Store HTTP " + response.status + ": " + payload.slice(0, 1e3)
    );
  return payload ? JSON.parse(payload) : {};
}
async function chromePublish(archive, options) {
  const client = process.env.CHROME_CLIENT_ID || "";
  const secret = process.env.CHROME_CLIENT_SECRET || "";
  const refresh = process.env.CHROME_REFRESH_TOKEN || "";
  if (![client, secret, refresh, options.publisher, options.extension].every(
    Boolean
  ))
    throw new Error(
      "Chrome OAuth credentials, publisher ID, and extension ID required"
    );
  const tokenResponse = await jsonRequest(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: client,
        client_secret: secret,
        refresh_token: refresh,
        grant_type: "refresh_token"
      })
    }
  );
  const token = tokenResponse.access_token;
  if (!token) throw new Error("Missing Chrome access token");
  const base = "https://chromewebstore.googleapis.com";
  const item = "/v2/publishers/" + encodeURIComponent(options.publisher) + "/items/" + encodeURIComponent(options.extension);
  const headers = { Authorization: "Bearer " + token };
  let result = await jsonRequest(base + "/upload" + item + ":upload", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/zip" },
    body: readFileSync(archive)
  });
  let state = result.uploadState;
  for (let attempt = 0; state === "IN_PROGRESS" && attempt < 30; attempt++) {
    await new Promise((resolve2) => setTimeout(resolve2, 1e4));
    result = await jsonRequest(base + item + ":fetchStatus", { headers });
    state = result.lastAsyncUploadState ?? result.uploadState;
  }
  if (state !== "SUCCEEDED")
    throw new Error("Chrome Web Store upload failed: " + state);
  await jsonRequest(base + item + ":publish", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ publishType: "DEFAULT_PUBLISH" })
  });
}
const program = new Command().name("browser-extension-publish").description(
  "Validate, package and submit Chrome/Firefox browser extensions"
);
program.command("validate").requiredOption("--build-directory <dir>").option("--registry <store>", "chrome | firefox | all", store, "all").option("--firefox-addon-id <id>", "Expected Gecko extension ID", "").action((opts) => {
  const result = validate(
    opts.buildDirectory,
    opts.registry,
    opts.firefoxAddonId
  );
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      "version=" + result.version + "\n"
    );
  console.log(JSON.stringify({ name: result.name, version: result.version }));
});
program.command("package").requiredOption("--build-directory <dir>").option("--output <zip>", "Archive destination", "extension.zip").action((opts) => {
  const directory = safeDir(opts.buildDirectory);
  readFileSync(join(directory, "manifest.json"));
  const output = resolve(process.cwd(), opts.output);
  if (existsSync(output)) throw new Error("Output already exists: " + output);
  mkdirSync(resolve(output, ".."), { recursive: true });
  execFileSync("zip", ["-q", "-r", output, "."], { cwd: directory });
  execFileSync("unzip", ["-t", output], { stdio: "ignore" });
  console.log("Packaged " + output);
});
program.command("publish-chrome").requiredOption("--archive <zip>").requiredOption("--publisher-id <id>").requiredOption("--extension-id <id>").action(async (opts) => {
  await chromePublish(resolve(opts.archive), {
    publisher: opts.publisherId,
    extension: opts.extensionId
  });
  console.log("Chrome Web Store publication submitted");
});
program.command("publish-firefox").requiredOption("--build-directory <dir>").option(
  "--output-directory <dir>",
  "Signed artifact directory",
  "firefox-signed"
).action((opts) => {
  const key = process.env.FIREFOX_API_KEY;
  const secret = process.env.FIREFOX_API_SECRET;
  if (!key || !secret) throw new Error("Firefox API credentials required");
  validate(opts.buildDirectory, "firefox");
  const output = safeDir(opts.outputDirectory);
  mkdirSync(output, { recursive: true });
  execFileSync(
    "npm",
    [
      "exec",
      "--yes",
      "--package=web-ext",
      "--",
      "web-ext",
      "sign",
      "--source-dir",
      safeDir(opts.buildDirectory),
      "--artifacts-dir",
      output,
      "--channel",
      "listed",
      "--api-key",
      key,
      "--api-secret",
      secret
    ],
    { stdio: "inherit" }
  );
  console.log("Firefox Add-ons submission completed");
});
await program.parseAsync();
export {
  chromePublish
};
