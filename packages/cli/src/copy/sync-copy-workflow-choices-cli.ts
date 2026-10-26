import { Command } from "commander";
import { syncCopyWorkflowChoices } from "./sync-copy-workflow-choices.ts";

export function createSyncCopyWorkflowChoicesCommand(): Command {
  return new Command("copy-workflow-choices")
    .requiredOption(
      "--config <path>",
      "YAML config file with a `source` section",
    )
    .requiredOption(
      "--source-directory <path>",
      "directory containing canonical workflow files",
    )
    .requiredOption(
      "--workflow <path>",
      "workflow file whose choices are synced",
    )
    .option("--check", "verify choices are current without writing")
    .action(syncCopyWorkflowChoices);
}

/** Invoke the CLI explicitly. */
export async function runSyncCopyWorkflowChoicesCli(
  argv: string[] = process.argv,
): Promise<void> {
  await createSyncCopyWorkflowChoicesCommand().parseAsync(argv);
}
