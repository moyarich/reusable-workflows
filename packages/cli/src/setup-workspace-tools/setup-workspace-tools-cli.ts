/** CLI entrypoint for Workspace Tools setup. */
import { createSetupWorkspaceToolsCommand } from "./setup-workspace-tools-command";

await createSetupWorkspaceToolsCommand().parseAsync();
