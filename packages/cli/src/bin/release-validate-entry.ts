/** Executable release metadata validation CLI entrypoint. */
import { createReleaseValidateCommand } from "./release-validate.js";

await createReleaseValidateCommand().parseAsync();
