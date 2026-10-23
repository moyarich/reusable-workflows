import { Command } from "commander";
/** Create the browser extension Commander subcommand. */
export function createBrowserCommand() {
  return new Command("browser")
    .description("Browser extension publishing utilities")
    .allowUnknownOption()
    .allowExcessArguments()
    .argument("[args...]")
    .action(async (args: string[]) => {
      const { runBrowserExtensionCli } =
        await import("../browser-extension-publish/browser-extension-publish-cli.js");
      await runBrowserExtensionCli([
        process.argv[0] ?? "node",
        "browser-extension-publish",
        ...args,
      ]);
    });
}
