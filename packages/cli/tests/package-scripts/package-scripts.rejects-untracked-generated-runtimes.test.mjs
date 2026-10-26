import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const rootScripts = JSON.parse(
  readFileSync(new URL("../../../../package.json", import.meta.url), "utf8"),
).scripts;
let root;
let env;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "package-scripts-test-"));
  const bin = join(root, "bin");
  mkdirSync(bin);
  const npm = join(bin, "npm");
  writeFileSync(npm, "#!/bin/sh\nexit 0\n");
  chmodSync(npm, 0o755);
  env = {
    ...process.env,
    PATH: bin + ":" + process.env.PATH,
  };
});
afterEach(() => rmSync(root, { recursive: true, force: true }));
function run(script) {
  return spawnSync("sh", ["-c", script], { cwd: root, env, encoding: "utf8" });
}
function git(...args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status) throw new Error(result.stderr);
}
function baseline() {
  git("init");
  mkdirSync(join(root, "actions"));
  writeFileSync(join(root, "actions/runtime.mjs"), "baseline\n");
  git("add", "actions");
  git(
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.com",
    "commit",
    "-m",
    "baseline",
  );
}

describe("distribution check scripts", () => {
  it("rejects untracked generated runtimes", () => {
    baseline();
    writeFileSync(join(root, "actions/new.mjs"), "new\n");
    const result = run(rootScripts["check:actions"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("actions/new.mjs");
  });
});
