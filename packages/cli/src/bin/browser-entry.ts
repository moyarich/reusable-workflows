/** Executable browser CLI entrypoint. */
import { createBrowserCommand } from "./browser.js";

await createBrowserCommand().parseAsync();
