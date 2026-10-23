import { Command } from "commander";
import { parseWorkspaceToolsSource } from "../setup-workspace-tools/setup-workspace-tools";

/** Create the workspace-tools source Commander command. */
export function createWorkspaceSourceCommand() {
  return new Command("workspace-source")
    .description("Parse a workspace-tools source selection")
    .requiredOption("--source <source>")
    .action(({ source }) =>
      console.log(JSON.stringify(parseWorkspaceToolsSource(source))),
    );
}

