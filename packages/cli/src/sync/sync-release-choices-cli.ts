import { Command, Option } from "commander";
import {
  DEFAULT_WORKFLOW,
  parseFileList,
  parseIncluded,
  syncReleaseChoices,
} from "./sync-release-choices.js";

/** Create the sync-release-choices Commander command. */
export function createSyncReleaseChoicesCommand(): Command {
  return new Command("sync-release-choices")
    .description("Sync workflow_dispatch package choices in workflow files")
    .addOption(
      new Option("--workflow-file <path>", "workflow file to update")
        .env("WORKFLOW_FILE")
        .default(DEFAULT_WORKFLOW),
    )
    .addOption(
      new Option("--workflow-files <json>", "JSON array of workflow files")
        .env("WORKFLOW_FILES")
        .argParser(parseFileList)
        .default([]),
    )
    .addOption(
      new Option("--release-packages <json>", "release packages JSON")
        .env("RELEASE_PACKAGES_JSON")
        .argParser(parseIncluded)
        .default([]),
    )
    .addOption(
      new Option("--publish-packages <json>", "publish packages JSON")
        .env("PUBLISH_PACKAGES_JSON")
        .argParser(parseIncluded)
        .default([]),
    )
    .action(syncReleaseChoices);
}

/** Invoke the CLI explicitly. */
export async function runSyncReleaseChoicesCli(
  argv: string[] = process.argv,
): Promise<void> {
  await createSyncReleaseChoicesCommand().parseAsync(argv);
}
