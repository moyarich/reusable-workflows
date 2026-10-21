/** Root Commander command and subcommand registration. @module */
import { Command } from "commander";
import { createWorkspaceSourceCommand } from "./bin/workspace-source";
import { createReleaseValidateCommand } from "./bin/release-validate";
import { createBrowserCommand } from "./bin/browser";

const program = new Command()
  .name("reusable-workflows-cli")
  .description("Reusable Workflows command-line utilities");
program.addCommand(createWorkspaceSourceCommand());
program.addCommand(createReleaseValidateCommand());
program.addCommand(createBrowserCommand());
await program.parseAsync();
