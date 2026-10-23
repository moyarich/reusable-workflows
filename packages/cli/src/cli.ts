/** Executable root Commander CLI entrypoint. */
import { createRootCliCommand } from "./root-cli-command.js";

await createRootCliCommand().parseAsync();
