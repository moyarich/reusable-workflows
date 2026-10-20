import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseWorkspaceToolsSource, resolveBinDir, validateBinDir } from "./setup-workspace-tools.ts";

test("supports npm latest, pinned versions and checkout sources", () => {
  assert.deepEqual(parseWorkspaceToolsSource("registry:npm:latest"), { mode: "registry", value: "latest", source: "registry:npm:latest" });
  assert.equal(parseWorkspaceToolsSource("registry:npm:0.2.2").value, "0.2.2");
  assert.equal(parseWorkspaceToolsSource("checkout:current").mode, "current");
  assert.equal(parseWorkspaceToolsSource("checkout:upstream;branch:main").value, "refs/heads/main");
  assert.equal(parseWorkspaceToolsSource("checkout:upstream;tag:v1.0.0").value, "refs/tags/v1.0.0");
  assert.equal(parseWorkspaceToolsSource("checkout:upstream;sha:" + "a".repeat(40)).value, "a".repeat(40));
});

test("rejects malformed, unsafe or unknown sources", () => {
  for (const value of ["registry:npm:", "registry:npm:^1.0.0", "registry:npm:next", "checkout:upstream;branch:../bad", "checkout:upstream;sha:abc", "checkout:else", ""]) {
    assert.throws(() => parseWorkspaceToolsSource(value), undefined, value);
  }
});

test("resolves and verifies CLI locations", () => {
  const root = mkdtempSync(join(tmpdir(), "workspace-tools-setup-"));
  try {
    const bin = join(root, "packages/workspace-tools/dist/bin");
    mkdirSync(bin, { recursive: true });
    writeFileSync(join(bin, "workspace-release.mjs"), "");
    writeFileSync(join(bin, "workspace-publish.mjs"), "");
    assert.equal(resolveBinDir("current", { workspace: root, runnerTemp: root }), bin);
    validateBinDir(bin);
    assert.throws(() => validateBinDir(join(root, "missing")), /missing/);
    assert.equal(resolveBinDir("registry", { workspace: root, runnerTemp: root, releaseBin: join(bin, "workspace-release") }), bin);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("Commander emits GitHub output and rejects unsupported flags", () => {
  const root = mkdtempSync(join(tmpdir(), "workspace-tools-setup-cli-"));
  try {
    const output = join(root, "outputs");
    execFileSync(process.execPath, ["--experimental-strip-types", "scripts/setup-workspace-tools/setup-workspace-tools.ts", "--workspace-tools-source", "registry:npm:latest", "--github-output", output], { cwd: new URL("../../", import.meta.url), encoding: "utf8" });
    assert.match(execFileSync("cat", [output], { encoding: "utf8" }), /mode=registry\nvalue=latest/);
    assert.throws(() => execFileSync(process.execPath, ["--experimental-strip-types", "scripts/setup-workspace-tools/setup-workspace-tools.ts", "--workspace-tools-source", "registry:npm:latest", "--invalid"], { cwd: new URL("../../", import.meta.url), stdio: "pipe" }));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
