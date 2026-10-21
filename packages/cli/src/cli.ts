import { Command } from "commander";
import { readFileSync } from "node:fs";
import { parseWorkspaceToolsSource } from "./actions/setup-workspace-tools/setup-workspace-tools";
import { validateReleaseMarker } from "./actions/release-draft-sync/identity";

const program = new Command()
  .name("reusable-workflows")
  .description("Reusable Workflows command-line utilities");

program
  .command("workspace-source")
  .requiredOption("--source <source>")
  .description("Parse a workspace-tools source selection")
  .action(({ source }) =>
    console.log(JSON.stringify(parseWorkspaceToolsSource(source))),
  );

program
  .command("release-validate")
  .requiredOption("--file <file>")
  .option("--tag <tag>")
  .option("--package <name>")
  .option("--version <version>")
  .option("--target <directory>")
  .description("Validate release identity in a Markdown file")
  .action((opts) => {
    const marker = validateReleaseMarker(readFileSync(opts.file, "utf8"), {
      tag: opts.tag,
      package: opts.package,
      version: opts.version,
      target: opts.target,
    });
    if (marker.format === "none")
      throw new Error("Release identity marker not found");
    console.log(JSON.stringify(marker));
  });

program
  .command("browser")
  .description("Browser extension publishing utilities")
  .allowUnknownOption()
  .allowExcessArguments()
  .argument("[args...]")
  .action(async (args: string[]) => {
    process.argv = [process.argv[0], "browser-extension-publish", ...args];
    await import("./actions/browser-extension-publish/browser-extension-publish-cli");
  });

await program.parseAsync();
