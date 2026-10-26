import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Command } from "commander";
import { copyWorkflow } from "./copy-workflows.js";

/**
 * Resolve the schema at invocation time, not module import time.
 * Vite bundles the CLI into dist/bin/cli.mjs, where source-relative
 * import.meta.url asset paths cannot be relied upon.
 */
function resolveDefaultSchema(): string {
  const executableDirectory = dirname(resolve(process.argv[1] ?? "."));
  const candidates = [
    resolve(executableDirectory, "../schemas/copy-files-config.schema.json"),
    resolve(executableDirectory, "../copy-files-to-another-repository/config.schema.json"),
    resolve(process.cwd(), "packages/cli/src/copy-files-to-another-repository/config.schema.json"),
    resolve(process.cwd(), "src/copy-files-to-another-repository/config.schema.json"),
  ];
  const schema = candidates.find((candidate) => existsSync(candidate));
  if (!schema) {
    throw new Error(
      "Cannot locate copy-files-config.schema.json; pass --schema <path> or rebuild the CLI runtime assets",
    );
  }
  return schema;
}

/** Create the copy-workflow Commander command. */
export function createCopyWorkflowCommand(): Command {
  return new Command("copy-workflow")
    .option(
      "--config <path>",
      "copier config file",
      ".github/copy-files-config.yml",
    )
    .option("--schema <path>", "JSON schema for the config")
    .option(
      "--repository <name>",
      "destination repository (must be allowlisted; empty or all selects all during planning)",
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
    .option("--workflow <name>", "workflow name or all", "")
    .action((opts) =>
      copyWorkflow({ ...opts, schema: opts.schema ?? resolveDefaultSchema() }),
    );
}

/** Invoke the CLI explicitly. */
export async function runCopyWorkflowCli(
  argv: string[] = process.argv,
): Promise<void> {
  await createCopyWorkflowCommand().parseAsync(argv);
}
