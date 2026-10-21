#!/usr/bin/env node
/**
 * Check that all shipped Actions can be recreated from authoritative sources.
 *
 * Root actions/ is a generated distribution. Never treat it as source.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");
const source = join(root, "packages/actions/actions");
const output = join(root, "actions");
const canonicalSchema = join(
  root,
  "reusable-configurations/check-dist-config.schema.json",
);
const canonicalExample = join(
  root,
  "reusable-configurations/check-dist-config.yml",
);
const runtimeSources = new Map([
  ["check-dist/select.mjs", "packages/cli/src/check-dist/select.mjs"],
  [
    "check-dist/config.schema.json",
    "reusable-configurations/check-dist-config.schema.json",
  ],
  [
    "resolve-workspaces/index.mjs",
    "packages/cli/src/resolve-workspaces/index.mjs",
  ],
  [
    "workflow-dispatch/index.mjs",
    "packages/cli/src/workflow-dispatch/workflow-dispatch.mjs",
  ],
  [
    "verify-workflow-runs/index.mjs",
    "packages/cli/src/verify-workflow-runs/index.mjs",
  ],
]);
const errors = [];
const actionNames = readdirSync(source, { withFileTypes: true })
  .filter((item) => item.isDirectory())
  .map((item) => item.name)
  .sort();
if (!actionNames.length)
  errors.push("No authored actions in packages/actions/actions");
for (const required of [canonicalSchema, canonicalExample]) {
  if (!existsSync(required))
    errors.push("Missing canonical configuration: " + required);
}
for (const name of actionNames) {
  const actionFile = join(source, name, "action.yml");
  if (!existsSync(actionFile)) {
    errors.push("Missing authoritative metadata: " + actionFile);
    continue;
  }
  const action = readFileSync(actionFile, "utf8");
  if (!/^\s*using:\s*(node24|composite)\s*$/m.test(action)) {
    errors.push("Unsupported or missing runtime: " + name);
  }
  if (/packages\/cli\/src\//.test(action)) {
    errors.push("Action metadata references unpublished CLI source: " + name);
  }
  if (!existsSync(join(output, name, "action.yml"))) {
    errors.push("Generated action missing: " + name);
  } else if (
    readFileSync(join(output, name, "action.yml"), "utf8") !== action
  ) {
    errors.push("Generated action metadata differs from source: " + name);
  }
}
for (const [generated, authored] of runtimeSources) {
  const from = join(root, authored);
  const to = join(output, generated);
  if (!existsSync(from)) errors.push("Missing runtime source: " + authored);
  if (!existsSync(to)) errors.push("Missing generated runtime: " + generated);
  if (
    existsSync(from) &&
    existsSync(to) &&
    readFileSync(from).compare(readFileSync(to)) !== 0
  ) {
    errors.push("Outdated generated runtime: " + generated);
  }
}
const expected = new Set([...actionNames, "_assets"]);
for (const entry of readdirSync(output, { withFileTypes: true })) {
  if (entry.isDirectory() && !expected.has(entry.name)) {
    errors.push("Unexpected distribution-only action directory: " + entry.name);
  }
}
if (errors.length) {
  console.error(errors.map((error) => "- " + error).join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Verified ${actionNames.length} regenerated action directories and ${runtimeSources.size} copied runtime files against authored sources.`,
  );
}
