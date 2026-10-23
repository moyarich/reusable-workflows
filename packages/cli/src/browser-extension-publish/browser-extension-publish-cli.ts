/** Commander-powered CLI command and feature implementation. @module */
import { Command, InvalidArgumentError } from "commander";
import { appendFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import process from "node:process";

import { validate, safeDir, type Store } from "./manifest";
import { firefoxPublish } from "./firefox-publish.js";
export { firefoxPublish } from "./firefox-publish.js";
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
    firefoxPublish(opts.buildDirectory, opts.outputDirectory);
    console.log("Firefox Add-ons submission completed");
  });
await program.parseAsync();
