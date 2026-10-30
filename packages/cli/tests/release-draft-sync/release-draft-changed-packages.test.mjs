import { describe, expect, it } from "vitest";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const workflow = readFileSync(new URL("../../../../.github/workflows/reusable_select-release-packages.yml", import.meta.url), "utf8");
const section = workflow.split('if [ "$CHANGED_PACKAGES_ONLY" = "true" ]; then')[1]?.split("              else")[0];
const script = section?.match(/node --input-type=module <<'NODE'\n([\s\S]*?)\n\s*NODE/)?.[1]
  ?.split("\n").map((line) => line.replace(/^ {10}/, "")).join("\n");

describe("changed-only release-draft selection", () => {
  it("selects changed and untagged packages, excluding manifest-only changes", () => {
    expect(script).toBeTruthy();
    const root = mkdtempSync(join(tmpdir(), "draft-changed-only-"));
    const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
    try {
      for (const name of ["changed", "unchanged", "metadata", "new"])
        mkdirSync(join(root, "packages", name), { recursive: true });
      git("init"); git("config", "user.email", "ci@example.com"); git("config", "user.name", "CI");
      for (const name of ["changed", "unchanged", "metadata", "new"]) {
        writeFileSync(join(root, "packages", name, "index.ts"), "export const count = 1;\n");
        writeFileSync(join(root, "packages", name, "package.json"), JSON.stringify({ name: "@example/" + name, version: "0.1.0" }));
      }
      git("add", "."); git("commit", "-m", "initial");
      for (const name of ["changed", "unchanged", "metadata"])
        git("tag", "packages/" + name + "@0.1.0");
      writeFileSync(join(root, "packages", "changed", "index.ts"), "export const count = 2;\n");
      writeFileSync(join(root, "packages", "metadata", "package.json"), '{"name":"@example/metadata","version":"0.2.0"}\n');
      git("add", "."); git("commit", "-m", "changed and metadata");
      const packages = ["changed", "unchanged", "metadata", "new"].map((name) => ({
        name: "@example/" + name, directory: "packages/" + name,
      }));
      const run = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
        cwd: root, encoding: "utf8", env: { ...process.env, PACKAGES_JSON: JSON.stringify(packages) },
      });
      expect(run.status, run.stderr).toBe(0);
      expect(JSON.parse(run.stdout).map((p) => p.name)).toEqual(["@example/changed", "@example/new"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
