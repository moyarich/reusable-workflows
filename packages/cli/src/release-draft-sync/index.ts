import { formatReleaseCommits } from "./commit-rules.js";
import {
  changelogSection,
  hasMeaningfulGeneratedBody,
} from "./release-note-rules.js";
import { reconcileReleaseBody } from "./release-body-rules.js";
/** Commander-powered CLI command and feature implementation. @module */
import {
  existsSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
import process from "node:process";
import { execFileSync } from "node:child_process";
function commitFallback(targetPath) {
  const args = ["log", "--reverse", "--format=%s%x09%h", "HEAD"];
  if (targetPath && targetPath !== ".") {
    args.push("--", targetPath);
  }
  const output = execFileSync("git", args, { encoding: "utf8" }).trim();
  return formatReleaseCommits(output);
}
function input(name, required = false) {
  const suffix = name.toUpperCase();
  const value =
    process.env[`INPUT_${suffix}`] ??
    process.env[`INPUT_${suffix.replaceAll("-", "_")}`] ??
    "";
  if (required && !value) {
    throw new Error(`Missing required input: ${name}`);
  }
  return value;
}
function setOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(
      outputFile,
      `${name}=${value}
`,
    );
  }
}
function runAction() {
  const existingBodyFile = input("existing-body-file", true);
  const generatedBodyFile = input("generated-body-file", true);
  const outputFile = input("output-file", true);
  const changelogPath = input("changelog-path") || "CHANGELOG.md";
  const version = input("version");
  const targetKey = input("target-key") || "root";
  const seedSha = input("seed-sha");
  const targetPath = input("target-path");
  const existingBody = existsSync(existingBodyFile)
    ? readFileSync(existingBodyFile, "utf8")
    : "";
  const generatedBody = existsSync(generatedBodyFile)
    ? readFileSync(generatedBodyFile, "utf8")
    : "";
  const curatedNotes =
    version && existsSync(changelogPath)
      ? changelogSection(readFileSync(changelogPath, "utf8"), version)
      : "";
  const commitNotes =
    !curatedNotes &&
    !existingBody.trim() &&
    !hasMeaningfulGeneratedBody(generatedBody.trim())
      ? commitFallback(targetPath)
      : "";
  const result = reconcileReleaseBody({
    existingBody,
    generatedBody,
    curatedNotes,
    commitNotes,
    targetKey,
    seedSha,
  });
  writeFileSync(
    outputFile,
    `${result.trim()}
`,
  );
  setOutput("body-file", outputFile);
  setOutput("seed-sha", seedSha);
}
function runEntryPoint() {
  try {
    runAction();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`release-draft-sync: ${message}
`);
    process.exitCode = 1;
  }
}
if (process.env.GITHUB_ACTIONS === "true") {
  runEntryPoint();
}
export { runAction };
