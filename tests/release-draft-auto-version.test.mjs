import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const workflow = readFileSync(new URL("../.github/workflows/reusable_release-drafter.yml", import.meta.url), "utf8");
const section = workflow.split("      - name: Resolve requested release version")[1].split("      # Resolve a complete release identity")[0];
const script = section.split("node --input-type=module <<'NODE'")[1].split("\n          NODE")[0].split("\n").map(line => line.replace(/^          /, "")).join("\n");

function resolve(mode, manifest, previous, bump = "patch") {
  const dir = mkdtempSync(join(tmpdir(), "release-draft-version-"));
  try {
    writeFileSync(join(dir, "package.json"), JSON.stringify({ version: manifest }));
    const output = join(dir, "output");
    const run = spawnSync(process.execPath, ["--input-type=module"], {
      input: script,
      encoding: "utf8",
      env: { ...process.env, MODE: mode, BUMP: bump, PREVIOUS_TAG: previous,
        PREFIX: "v", DIRECTORY: dir, INITIAL: "0.1.0", EXPLICIT: "",
        EXACT: "", GITHUB_OUTPUT: output },
    });
    assert.equal(run.status, 0, run.stderr);
    return readFileSync(output, "utf8").trim();
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("auto uses published release, not ahead-of-release package.json", () => {
  assert.equal(resolve("auto", "0.2.1", "v0.2.0"), "version=0.2.1");
  assert.equal(resolve("auto", "0.3.0", "v0.2.0"), "version=0.2.1");
  assert.equal(resolve("", "0.2.1", "v0.2.0"), "version=0.2.1");
});
test("manifest and explicit bump modes retain their behavior", () => {
  assert.equal(resolve("package-json", "0.3.0", "v0.2.0"), "version=0.3.0");
  assert.equal(resolve("bump", "0.3.0", "v0.2.0"), "version=0.3.1");
  assert.equal(resolve("auto", "0.3.0", ""), "version=0.1.0");
});
