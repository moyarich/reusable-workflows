/** Executable workspace source CLI entrypoint. */
import { createWorkspaceSourceCommand } from "./workspace-source.js";

await createWorkspaceSourceCommand().parseAsync();
