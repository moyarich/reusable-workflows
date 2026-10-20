import { Command } from "commander";
import { readFileSync } from "node:fs";
import { parseWorkspaceToolsSource } from "../../../src/actions/setup-workspace-tools/setup-workspace-tools";
import { validateReleaseMarker } from "../../../src/actions/release-draft-sync/identity";

const program = new Command().name("reusable-workflows").description("Reusable Workflows CLI");
program.command("workspace-source")
  .description("Resolve a workspace-tools CLI source")
  .requiredOption("--source <source>")
  .action(({ source }) => console.log(JSON.stringify(parseWorkspaceToolsSource(source))));
program.command("release-validate")
  .description("Validate a release identity marker in a local Markdown file")
  .requiredOption("--file <file>")
  .option("--tag <tag>")
  .option("--package <name>")
  .option("--version <version>")
  .option("--target <directory>")
  .action(opts => {
    const marker = validateReleaseMarker(readFileSync(opts.file, "utf8"), {
      tag: opts.tag, package: opts.package, version: opts.version, target: opts.target,
    });
    if (marker.format === "none") throw new Error("Release identity marker not found");
    console.log(JSON.stringify(marker));
  });
program.command("browser")
  .description("Browser extension publisher (validate, package, publish-chrome, publish-firefox)")
  .allowUnknownOption()
  .allowExcessArguments()
  .argument("[args...]")
  .action(async (args: string[]) => {
    process.argv = [process.argv[0], "browser-extension-publish", ...args];
    await import("../../../src/actions/browser-extension-publish/browser-extension-publish-cli");
  });
await program.parseAsync();
