import { Command } from "commander";
/** Create the browser extension Commander subcommand. */
export function createBrowserCommand() {
  return new Command("browser")
    .description("Browser extension publishing utilities")
    .allowUnknownOption()
    .allowExcessArguments()
    .argument("[args...]")
    .action(async (args: string[]) => {
      process.argv = [process.argv[0], "browser-extension-publish", ...args];
      await import("../browser-extension-publish/browser-extension-publish-cli");
    });
}
if (process.argv[1] && /browser\.mjs$/.test(process.argv[1])) {
  await createBrowserCommand().parseAsync();
}
