/** Create the sync-workflow-choices Commander command. */
import { Command } from "commander";
import { syncWorkflowChoices } from "./sync-workflow-choices.ts";

export function createSyncWorkflowChoicesCommand(): Command {
  return new Command("sync-workflow-choices")
    .requiredOption(
      "--source <path>",
      "YAML or JSON file containing the values",
    )
    .requiredOption(
      "--values-path <path>",
      "dot-separated path to the array in the source",
    )
    .option(
      "--value-field <name>",
      "field to read from each object in the array",
    )
    .option("--prepend <value>", "extra option to place first (e.g. all)")
    .requiredOption("--input <name>", "workflow_dispatch input to update")
    .requiredOption(
      "--default <value>",
      "default choice (must be an available option)",
    )
    .requiredOption("--workflow <path>", "workflow file to update")
    .option("--check", "verify choices are current without writing")
    .action(syncWorkflowChoices);
}

/** Invoke the CLI explicitly. */
export async function runSyncWorkflowChoicesCli(
  argv: string[] = process.argv,
): Promise<void> {
  await createSyncWorkflowChoicesCommand().parseAsync(argv);
}
