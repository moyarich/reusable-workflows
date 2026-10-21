import { test, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const action = fileURLToPath(new URL("../src/actions/release-tag/index.mjs", import.meta.url));
const sha = "a".repeat(40);
const newerSha = "b".repeat(40);

function run(inputs, responses) {
  const temp = mkdtempSync(join(tmpdir(), "release-tag-test-"));
  const command = join(temp, "gh");
  const log = join(temp, "calls.jsonl");
  const output = join(temp, "output");
  const fixture = join(temp, "responses.json");
  writeFileSync(fixture, JSON.stringify(responses));
  writeFileSync(command, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.MOCK_LOG, JSON.stringify(args) + "\\n");
const key = args[0] === "api" ? args.filter((arg) => arg.startsWith("repos/"))[0] : "";
const responses = JSON.parse(fs.readFileSync(process.env.MOCK_FIXTURE, "utf8"));
if (!(key in responses)) {
  process.stderr.write("HTTP 404 Not Found");
  process.exit(1);
}
process.stdout.write(JSON.stringify(responses[key]));
`, { mode: 0o755 });
  const env = {
    ...process.env,
    PATH: temp + ":" + process.env.PATH,
    MOCK_LOG: log,
    MOCK_FIXTURE: fixture,
    GITHUB_OUTPUT: output,
    GITHUB_REPOSITORY: "example/repo",
    GITHUB_TOKEN: "test",
  };
  for (const [key, value] of Object.entries(inputs)) env["INPUT_" + key.toUpperCase().replaceAll("-", "_")] = String(value);
  const result = spawnSync(process.execPath, [action], { env, encoding: "utf8" });
  const calls = readFileSync(log, "utf8").trim().split("\n").map((s) => JSON.parse(s));
  const outputs = result.status === 0 ? readFileSync(output, "utf8") : "";
  rmSync(temp, { recursive: true, force: true });
  return { ...result, calls, outputs };
}
const released = (tag) => ({ tag_name: tag, draft: false, prerelease: false });
const ref = (commit) => ({ object: { type: "commit", sha: commit } });

test("promotes highest published stable release without changing refs in dry-run", () => {
  const res = run({ mode: "promote", "source-tag": "v1.4.0", "dry-run": true }, {
    "repos/example/repo/releases/tags/v1.4.0": released("v1.4.0"),
    "repos/example/repo/git/ref/tags/v1.4.0": ref(sha),
    "repos/example/repo/releases?per_page=100": [[released("v1.4.0"), released("v1.3.0")]],
  });
  expect(res.status).toBe(0);
  expect(res.outputs).toContain("major-tag=v1");
  expect(res.outputs).toContain("outcome=would-create");
  expect(res.calls.every((args) => !args.includes("PATCH") && !args.includes("POST"))).toBe(true);
});

test("rejects old stable releases when newer published version exists", () => {
  const res = run({ mode: "promote", "source-tag": "v1.3.0" }, {
    "repos/example/repo/releases/tags/v1.3.0": released("v1.3.0"),
    "repos/example/repo/git/ref/tags/v1.3.0": ref(sha),
    "repos/example/repo/releases?per_page=100": [[released("v1.3.0"), released("v1.4.0")]],
  });
  expect(res.status).not.toBe(0);
  expect(res.stderr).toMatch(/refusing to downgrade/);
});

test("restore refuses finalized releases even in dry-run", () => {
  const res = run({ mode: "restore", tag: "v2.0.0", commit: sha }, {
    ["repos/example/repo/commits/" + sha]: { sha },
    "repos/example/repo/releases/tags/v2.0.0": released("v2.0.0"),
  });
  expect(res.status).not.toBe(0);
  expect(res.stderr).toMatch(/finalized or immutable/);
});

test("restore allows a draft historical tag preview", () => {
  const res = run({ mode: "restore", tag: "v2.0.0", commit: newerSha }, {
    ["repos/example/repo/commits/" + newerSha]: { sha: newerSha },
    "repos/example/repo/releases/tags/v2.0.0": { draft: true, immutable: false },
  });
  expect(res.status).toBe(0);
  expect(res.outputs).toContain("outcome=would-create");
});
