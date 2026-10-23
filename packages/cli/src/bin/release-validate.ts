import { Command } from "commander";
import { readFileSync } from "node:fs";
import { validateReleaseMarker } from "../release-draft-sync/identity";

/** Create the release metadata validation Commander command. */
export function createReleaseValidateCommand() {
  return new Command("release-validate")
    .description("Validate release identity in a Markdown file")
    .requiredOption("--file <file>")
    .option("--tag <tag>")
    .option("--package <name>")
    .option("--version <version>")
    .option("--target <directory>")
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
}

