/** Import-safe root Commander command construction. */
import { Command } from "commander";
import { createWorkspaceSourceCommand } from "./bin/workspace-source.js";
import { createReleaseValidateCommand } from "./bin/release-validate.js";
import { createBrowserCommand } from "./bin/browser.js";

/** Construct a fresh root CLI with all supported subcommands. */
export function createRootCliCommand(): Command {
  const program = new Command()
    .name("reusable-workflows-cli")
    .description("Reusable Workflows command-line utilities");
  program.addCommand(createWorkspaceSourceCommand());
  program.addCommand(createReleaseValidateCommand());
  program.addCommand(createBrowserCommand());
  return program;
}
