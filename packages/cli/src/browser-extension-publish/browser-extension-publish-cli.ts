/** Commander-powered CLI command and feature implementation. @module */
import { Command, Option } from "commander";
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

import { chromePublish } from "./chrome-publish.ts";
import { firefoxPublish } from "./firefox-publish.ts";
import { validate, type Store } from "./manifest.ts";
import { packageExtension } from "./package-extension.ts";

export { chromePublish } from "./chrome-publish.ts";
export { firefoxPublish } from "./firefox-publish.ts";
export { packageExtension } from "./package-extension.ts";

const STORES = ["chrome", "firefox", "all"] as const satisfies readonly Store[];

interface ValidateOptions {
  buildDirectory: string;
  registry: Store;
  firefoxAddonId: string;
}

interface PackageOptions {
  buildDirectory: string;
  output: string;
}

interface PublishChromeOptions {
  archive: string;
  publisherId: string;
  extensionId: string;
}

interface PublishFirefoxOptions {
  buildDirectory: string;
  outputDirectory: string;
}

/** Build the browser extension command tree without executing it. */
export function createBrowserExtensionProgram(): Command {
  const program = new Command()
    .name("browser-extension-publish")
    .description(
      "Validate, package and submit Chrome/Firefox browser extensions",
    );

  program
    .command("validate")
    .requiredOption("--build-directory <dir>", "built extension directory")
    .addOption(
      new Option("--registry <store>", STORES.join(" | "))
        .choices(STORES)
        .default("all" satisfies Store),
    )
    .option("--firefox-addon-id <id>", "Expected Gecko extension ID", "")
    .action((opts: ValidateOptions) => {
      const result = validate(
        opts.buildDirectory,
        opts.registry,
        opts.firefoxAddonId,
      );
      if (process.env.GITHUB_OUTPUT) {
        appendFileSync(
          process.env.GITHUB_OUTPUT,
          `version=${result.version}\n`,
        );
      }
      console.log(
        JSON.stringify({ name: result.name, version: result.version }),
      );
    });

  program
    .command("package")
    .requiredOption("--build-directory <dir>", "built extension directory")
    .option("--output <zip>", "Archive destination", "extension.zip")
    .action((opts: PackageOptions) => {
      const output = packageExtension(opts.buildDirectory, opts.output);
      console.log(`Packaged ${output}`);
    });

  program
    .command("publish-chrome")
    .requiredOption("--archive <zip>", "extension archive to upload")
    .requiredOption("--publisher-id <id>", "Chrome Web Store publisher ID")
    .requiredOption("--extension-id <id>", "Chrome Web Store extension ID")
    .action(async (opts: PublishChromeOptions) => {
      await chromePublish(resolve(opts.archive), {
        publisher: opts.publisherId,
        extension: opts.extensionId,
      });
      console.log("Chrome Web Store publication submitted");
    });

  program
    .command("publish-firefox")
    .requiredOption("--build-directory <dir>", "built extension directory")
    .option(
      "--output-directory <dir>",
      "Signed artifact directory",
      "firefox-signed",
    )
    .action(async (opts: PublishFirefoxOptions) => {
      await firefoxPublish(opts.buildDirectory, opts.outputDirectory);
      console.log("Firefox Add-ons submission completed");
    });

  return program;
}

/** Create the browser extension Commander subcommand. */
export function createBrowserCommand(): Command {
  return createBrowserExtensionProgram()
    .name("browser")
    .description("Browser extension publishing utilities");
}

/** Invoke the browser extension CLI explicitly. */
export async function runBrowserExtensionCli(
  argv: string[] = process.argv,
): Promise<void> {
  await createBrowserExtensionProgram().parseAsync(argv);
}
