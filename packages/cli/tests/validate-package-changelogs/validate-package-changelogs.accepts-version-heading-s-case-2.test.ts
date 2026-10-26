import { describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const action = readFileSync(
  new URL(
    "../../../actions/actions/validate-package-changelogs/action.yml",
    import.meta.url,
  ),
  "utf8",
);
const script = action
  .split("node --input-type=module <<'NODE'\n")[1]
  ?.split("\n        NODE")[0];
if (!script)
  throw new Error("Cannot find changelog validator script in composite action");

function validate(heading: string | null, version = "0.2.2") {
  const cwd = mkdtempSync(join(tmpdir(), "changelog-validator-"));
  try {
    mkdirSync(join(cwd, "packages/workspace-tools"), { recursive: true });
    writeFileSync(
      join(cwd, "package.json"),
      JSON.stringify({ workspaces: ["packages/*"] }),
    );
    writeFileSync(
      join(cwd, "packages/workspace-tools/package.json"),
      JSON.stringify({ name: "@moyarich/workspace-tools", version }),
    );
    if (heading !== null) {
      writeFileSync(
        join(cwd, "packages/workspace-tools/CHANGELOG.md"),
        "# Changelog\n\n## Unreleased\n\n" + heading + "\n",
      );
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
  test("accepts version heading %s (case 2)", () => {
    const heading = "## [0.2.2]";
    const result = validate(heading);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Validated 1 workspace changelogs.");
  });
});
