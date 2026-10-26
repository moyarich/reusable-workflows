/** Executable root Commander CLI entrypoint. */

import { Command } from "commander";

import { createWorkspaceSourceCommand } from "../setup-workspace-tools/workspace-source-cli.js";
import { createBrowserCommand } from "../browser-extension-publish/browser-extension-publish-cli.js";
import { createReleaseValidateCommand } from "../release-draft-sync/release-validate-cli.js";

import { createSetupWorkspaceToolsCommand } from "../setup-workspace-tools/setup-workspace-tools-cli.js";
import { createCopyWorkflowCommand } from "../copy/copy-workflows-cli.js";
import { createSyncCopyWorkflowChoicesCommand } from "../copy/sync-copy-workflow-choices-cli.js";
import { createSyncWorkflowChoicesCommand } from "../sync/sync-workflow-choices-cli.js";
import { createSyncReleaseChoicesCommand } from "../sync/sync-release-choices-cli.js";

import { createSyncReleaseSummaryCommand } from "../sync/sync-release-summary-cli.js";

/** Construct a fresh root CLI with all supported subcommands. */
export function createRootCliCommand(): Command {
  const program = new Command()
    .name("reusable-workflows-cli")
    .description("Reusable Workflows command-line utilities");
  program.addCommand(createWorkspaceSourceCommand());
  program.addCommand(createReleaseValidateCommand());
  program.addCommand(createBrowserCommand());
  program.addCommand(createSetupWorkspaceToolsCommand());
  program.addCommand(createCopyWorkflowCommand());
  program.addCommand(createSyncCopyWorkflowChoicesCommand());
  program.addCommand(createSyncWorkflowChoicesCommand());
  program.addCommand(createSyncReleaseChoicesCommand());
  program.addCommand(createSyncReleaseSummaryCommand());
  return program;
}

await createRootCliCommand().parseAsync();
