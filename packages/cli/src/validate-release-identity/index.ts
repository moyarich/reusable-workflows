/** GitHub release identity validation action adapter. */
import process from "node:process";
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { validateReleaseMarker } from "../release-draft-sync/identity";
import { findReleaseByTag } from "./release-lookup.js";

const input = (name: string): string => {
  const key = "INPUT_" + name.toUpperCase();
  return process.env[key] ?? process.env[key.replaceAll("-", "_")] ?? "";
};

/** Run identity validation using GitHub CLI and GitHub Actions outputs. */
export function runAction(): void {
  const tag = input("release-tag");
  if (!tag) throw new Error("release-tag is required");
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository || !/^[\w.-]+\/[\w.-]+$/.test(repository))
    throw new Error("Invalid GitHub repository");
  const raw = execFileSync(
    "gh",
    [
      "api",
      "--paginate",
      "--slurp",
      "repos/" + repository + "/releases?per_page=100",
    ],
    { encoding: "utf8" },
  );
  const release = findReleaseByTag(raw, tag);
  if (!release) {
    if (input("required") === "true")
      throw new Error("No GitHub Release for tag: " + tag);
    console.log(
      "No release exists for tag " + tag + "; skipping marker validation.",
    );
    return;
  }
  const marker = validateReleaseMarker(release.body || "", {
    tag,
    package: input("package-name"),
    version: input("version"),
    target: input("target"),
  });
  console.log("Release " + tag + " metadata format: " + marker.format);
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, "format=" + marker.format + "\n");
}
