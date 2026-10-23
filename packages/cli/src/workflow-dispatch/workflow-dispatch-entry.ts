/** Executable workspace release Commander entrypoint. */
import { createWorkspaceReleaseCommand } from "./workflow-dispatch-cli.js";

await createWorkspaceReleaseCommand().parseAsync();
