import { Command } from "commander";
import { parseWorkspaceToolsSource } from "../setup-workspace-tools/setup-workspace-tools";

export function createWorkspaceSourceCommand() {
  return new Command("workspace-source")
    .description("Parse a workspace-tools source selection")
    .requiredOption("--source <source>")
    .action(({ source }) =>
      console.log(JSON.stringify(parseWorkspaceToolsSource(source))),
    );
}

if (process.argv[1] && /workspace-source\.mjs$/.test(process.argv[1])) {
  await createWorkspaceSourceCommand().parseAsync();
}
