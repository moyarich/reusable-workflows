import { Command } from "commander";
import { runSyncReleaseSummary } from "./sync-release-summary.js";

/** Create the release package synchronization summary command. */
export function createSyncReleaseSummaryCommand(): Command {
  return new Command("sync-release-summary")
    .description("Write a release package synchronization summary")
    .action(() => runSyncReleaseSummary());
}
