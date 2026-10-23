/** Commander-powered CLI command and feature implementation. @module */
import { Command, InvalidArgumentError } from "commander";
import { appendFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import process from "node:process";

import { validate, safeDir, type Store } from "./manifest";
const store = (value: string): Store => {
  if (!["chrome", "firefox", "all"].includes(value))
    throw new InvalidArgumentError("registry must be chrome, firefox, or all");
  return value as Store;
};
import { chromePublish } from "./chrome-publish.js";
export { chromePublish } from "./chrome-publish.js";
const program = new Command()
  .name("browser-extension-publish")
  .description(
    "Validate, package and submit Chrome/Firefox browser extensions",
  );
program
  .command("validate")
  .requiredOption("--build-directory <dir>")
  .option("--registry <store>", "chrome | firefox | all", store, "all")
  .option("--firefox-addon-id <id>", "Expected Gecko extension ID", "")
  .action((opts) => {
    const result = validate(
      opts.buildDirectory,
      opts.registry,
      opts.firefoxAddonId,
    );
    if (process.env.GITHUB_OUTPUT)
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        "version=" + result.version + "\n",
      );
    console.log(JSON.stringify({ name: result.name, version: result.version }));
  });
program
  .command("package")
  .requiredOption("--build-directory <dir>")
  .option("--output <zip>", "Archive destination", "extension.zip")
  .action((opts) => {
    const directory = safeDir(opts.buildDirectory);
    readFileSync(join(directory, "manifest.json"));
    const output = resolve(process.cwd(), opts.output);
    if (existsSync(output)) throw new Error("Output already exists: " + output);
    mkdirSync(resolve(output, ".."), { recursive: true });
    execFileSync("zip", ["-q", "-r", output, "."], { cwd: directory });
    execFileSync("unzip", ["-t", output], { stdio: "ignore" });
    console.log("Packaged " + output);
  });
program
  .command("publish-chrome")
  .requiredOption("--archive <zip>")
  .requiredOption("--publisher-id <id>")
  .requiredOption("--extension-id <id>")
  .action(async (opts) => {
    await chromePublish(resolve(opts.archive), {
      publisher: opts.publisherId,
      extension: opts.extensionId,
    });
    console.log("Chrome Web Store publication submitted");
  });
program
  .command("publish-firefox")
  .requiredOption("--build-directory <dir>")
  .option(
    "--output-directory <dir>",
    "Signed artifact directory",
    "firefox-signed",
  )
  .action((opts) => {
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
        secret,
      ],
      { stdio: "inherit" },
    );
    console.log("Firefox Add-ons submission completed");
  });
await program.parseAsync();
