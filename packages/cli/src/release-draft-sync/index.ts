import {
  splitGeneratedRegion,
  pullRequestMarkers,
  generatedEntries,
  appendCategoryEntries,
  mergeGeneratedEntries,
  generatedRegion,
  ensureMetadata,
} from "./reconcile-rules.js";
import {
  changelogSection,
  hasMeaningfulGeneratedBody,
} from "./release-note-rules.js";
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
  if (!output) return "";
  const excludedTypes = /* @__PURE__ */ new Set([
    "docs",
    "build",
    "ci",
    "test",
    "style",
    "chore",
    "refactor",
  ]);
  const seen = /* @__PURE__ */ new Set();
  const entries = [];
  for (const row of output.split("\n")) {
    const [rawSubject, hash = ""] = row.split("	", 2);
    const subject = rawSubject?.trim();
    if (!subject || /^release(?:\([^)]*\))?:/i.test(subject)) continue;
    const match = subject.match(
      /^(feat|fix|perf|refactor|docs|build|ci|test|style|chore)(?:\([^)]*\))?!?:\s*(.+)$/i,
    );
    const type = match?.[1]?.toLowerCase() ?? "";
    const summary = (match?.[2] ?? subject).replace(/\s*\(#\d+\)$/, "").trim();
    if (!summary || excludedTypes.has(type)) continue;
    const key = summary.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(hash ? `- ${summary} (${hash})` : `- ${summary}`);
  }
  return entries.join("\n");
}
function resolveInitialSeed(options) {
  if (options.changelogPath && existsSync(options.changelogPath)) {
    const changelog = readFileSync(options.changelogPath, "utf8");
    const notes = changelogSection(changelog, options.version);
    if (notes) return { source: "changelog", body: notes };
  }
  const generated = options.generatedBody.trim();
  if (hasMeaningfulGeneratedBody(generated)) {
    return { source: "release-drafter", body: generatedRegion(generated) };
  }
  const commits = commitFallback(options.targetPath);
  if (commits) {
    return {
      source: "commits",
      body: `## Release notes

${commits}`,
    };
  }
  return { source: "minimal", body: "## Release notes\n\nInitial release." };
}
function reconcileReleaseBody(options) {
  const existing = options.existingBody.trim();
  const generated = options.generatedBody.trim();

  // A release-specific curated changelog is the source of truth for public
  // notes. Do not reintroduce internal PR titles or stale install commands
  // from persistent Release Drafter output on subsequent runs.
  if (
    options.version &&
    options.changelogPath &&
    existsSync(options.changelogPath)
  ) {
    const curated = changelogSection(
      readFileSync(options.changelogPath, "utf8"),
      options.version,
    );
    if (curated) {
      const existingSeed = existing.match(
        /<!--\\s*release-draft-sync:seed-sha=([^\\s]+)(?:\\s+source=[^>]+)?\\s*-->/,
      );
      const seedSha = existingSeed?.[1] || options.seedSha;
      return ensureMetadata(curated, options.targetKey, seedSha, "changelog");
    }
  }
  if (!existing) {
    const seed = resolveInitialSeed(options);
    return ensureMetadata(
      seed.body,
      options.targetKey,
      options.seedSha,
      seed.source,
    );
  }
  let body = existing;
  const split = splitGeneratedRegion(body);
  if (hasMeaningfulGeneratedBody(generated)) {
    if (split) {
      const mergedGenerated = mergeGeneratedEntries(split.generated, generated);
      body = [split.before, generatedRegion(mergedGenerated), split.after]
        .filter(Boolean)
        .join("\n\n");
    } else {
      const existingMarkers = pullRequestMarkers(body);
      let managed = "";
      for (const [category, entries] of generatedEntries(generated)) {
        const missing = entries.filter((entry) => {
          const match = entry.match(/release-draft-sync:pr=(\d+)/);
          return match && !existingMarkers.has(match[1]);
        });
        managed = appendCategoryEntries(managed, category, missing);
      }
      if (managed) {
        body = `${body.trim()}

${generatedRegion(managed)}`;
      }
    }
  }
  return ensureMetadata(body, options.targetKey, options.seedSha, "existing");
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
  const result = reconcileReleaseBody({
    existingBody: existsSync(existingBodyFile)
      ? readFileSync(existingBodyFile, "utf8")
      : "",
    generatedBody: existsSync(generatedBodyFile)
      ? readFileSync(generatedBodyFile, "utf8")
      : "",
    changelogPath,
    version,
    targetKey,
    seedSha,
    targetPath,
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
