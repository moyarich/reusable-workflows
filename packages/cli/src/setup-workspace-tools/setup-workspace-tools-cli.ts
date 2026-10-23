/** CLI entrypoint for Workspace Tools setup. */
import { createSetupWorkspaceToolsCommand } from "./setup-workspace-tools-command.js";

/** Invoke the Workspace Tools setup CLI explicitly. */
export async function runSetupWorkspaceToolsCli(
  argv: string[] = process.argv,
): Promise<void> {
  await createSetupWorkspaceToolsCommand().parseAsync(argv);
}

if (process.argv[1] && /setup-workspace-tools\.mjs$/.test(process.argv[1])) {
  await runSetupWorkspaceToolsCli();
}
