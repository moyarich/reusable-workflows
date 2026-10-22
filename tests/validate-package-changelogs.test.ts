import { describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const action = readFileSync(
  new URL("../packages/actions/actions/validate-package-changelogs/action.yml", import.meta.url),
  "utf8",
);
const script = action.split("node --input-type=module <<'NODE'\n")[1]?.split("\n        NODE")[0];
if (!script) throw new Error("Cannot find changelog validator script in composite action");

function validate(heading: string | null, version = "0.2.2") {
  const cwd = mkdtempSync(join(tmpdir(), "changelog-validator-"));
  try {
    mkdirSync(join(cwd, "packages/workspace-tools"), { recursive: true });
    writeFileSync(join(cwd, "package.json"), JSON.stringify({ workspaces: ["packages/*"] }));
    writeFileSync(
      join(cwd, "packages/workspace-tools/package.json"),
      JSON.stringify({ name: "@moyarich/workspace-tools", version }),
    );
    if (heading !== null) {
      writeFileSync(join(cwd, "packages/workspace-tools/CHANGELOG.md"), "# Changelog\n\n## Unreleased\n\n" + heading + "\n");
    }
    return spawnSync(process.execPath, ["--input-type=module"], {
      input: script,
      cwd,
      encoding: "utf8",
    });
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

describe("validate-package-changelogs composite action", () => {
  test.each([
    "## 0.2.2",
    "## [0.2.2]",
    "## [0.2.2](https://example.com/releases/0.2.2)",
    "## [0.2.2] - 2026-10-21",
  ])("accepts version heading %s", (heading) => {
    const result = validate(heading);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Validated 1 workspace changelogs.");
  });

  test.each(["## Unreleased", "## [0.2.20]", "## 0.2.20", "### [0.2.2]"])(
    "rejects unmatched heading %s",
    (heading) => {
      const result = validate(heading);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("must contain a version heading");
    },
  );

  test("rejects missing changelog", () => {
    const result = validate(null);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("missing");
  });
});
