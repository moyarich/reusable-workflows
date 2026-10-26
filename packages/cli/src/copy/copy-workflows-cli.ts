import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { Command } from "commander";
import { createCopyWorkflow } from "./copy-workflows.ts";

// Bundled executables use the published schema; source invocations use the original.
const bundledSchema = new URL(
  "../schemas/copy-files-config.schema.json",
  import.meta.url,
);
const defaultSchema = fileURLToPath(
  existsSync(bundledSchema)
    ? bundledSchema
    : new URL(
        "../copy-files-to-another-repository/config.schema.json",
        import.meta.url,
      ),
);

/** Create the copy-workflow Commander command. */
export function createCopyWorkflowCommand(): Command {
  return new Command("copy-workflow")
    .option(
      "--config <path>",
      "copier config file",
      ".github/copy-files-config.yml",
    )
    .option("--schema <path>", "JSON schema for the config", defaultSchema)
    .option(
      "--repository <name>",
      "destination repository (must be in the allowlist)",
    )
    .option("--plan", "emit the job matrix instead of generating files")
    .option("--output <path>", "output directory for generated files")
    .option(
      "--existing-files <path>",
      "JSON array of existing destination filenames",
    )
    .option(
      "--destination-publish-file <path>",
      "destination publish workflow file",
    )
    .option("--source-root <path>", "source repository root", ".")
    .option("--workflow <name>", "workflow name", "")
    .action(createCopyWorkflow);
}

/** Invoke the CLI explicitly. */
export async function runCopyWorkflowCli(
  argv: string[] = process.argv,
): Promise<void> {
  await createCopyWorkflowCommand().parseAsync(argv);
}
