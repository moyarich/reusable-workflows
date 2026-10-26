/** Executable workspace source CLI entrypoint. */
import { Command } from "commander";
import { parseWorkspaceToolsSource } from "./setup-workspace-tools.ts";

/** Create the workspace-tools source Commander command. */
export function createWorkspaceSourceCommand() {
  return new Command("workspace-source")
    .description("Parse a workspace-tools source selection")
    .requiredOption("--source <source>")
    .action(({ source }) =>
      console.log(JSON.stringify(parseWorkspaceToolsSource(source))),
    );
}

/** Invoke the CLI explicitly. */
export async function runWorkspaceSourceCli(
  argv: string[] = process.argv,
): Promise<void> {
  await createWorkspaceSourceCommand().parseAsync(argv);
}
