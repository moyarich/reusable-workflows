/** Commander-powered CLI command and feature implementation. @module */
import { Command, InvalidArgumentError } from "commander";
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

import { validate, type Store } from "./manifest";
import { packageExtension } from "./package-extension.js";
export { packageExtension } from "./package-extension.js";
import { firefoxPublish } from "./firefox-publish.js";
export { firefoxPublish } from "./firefox-publish.js";
const store = (value: string): Store => {
  if (!["chrome", "firefox", "all"].includes(value))
    throw new InvalidArgumentError("registry must be chrome, firefox, or all");
  return value as Store;
};
import { chromePublish } from "./chrome-publish.js";
export { chromePublish } from "./chrome-publish.js";
/** Build the browser extension command tree without executing it. */
export function createBrowserExtensionProgram(): Command {
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
    const output = packageExtension(opts.buildDirectory, opts.output);
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
  return program;
}

/** Execute the browser extension CLI with the supplied argv. */
export async function runBrowserExtensionCli(argv: string[] = process.argv): Promise<void> {
  await createBrowserExtensionProgram().parseAsync(argv);
}

