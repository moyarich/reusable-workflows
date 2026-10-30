import { describe, expect, it } from "vitest";
import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const workflow = readFileSync(
  new URL(
    "../../../../.github/workflows/reusable_release-drafter.yml",
    import.meta.url,
  ),
  "utf8",
);
const section = workflow
  .split("id: resolve-version")[1]
  ?.split("      - name:")[0];
const script = section
  ?.match(/node --input-type=module <<'NODE'\n([\s\S]*?)\n\s*NODE/)?.[1]
  ?.split("\n")
  .map((line) => line.replace(/^          /, ""))
  .join("\n");

describe("release-draft version selection", () => {
  it.each([
    ["bump", "minor", "", "0.2.0"],
    ["bump", "patch", "", "0.1.1"],
    ["auto", "minor", "", "0.1.0"],
    ["bump", "minor", "@example/lib@0.1.0", "0.2.0"],
  ])(
    "resolves %s/%s with previous tag %s to %s",
    (mode, bump, previous, expected) => {
      expect(script).toBeTruthy();
      const root = mkdtempSync(join(tmpdir(), "draft-first-bump-"));
      try {
        mkdirSync(join(root, "packages/lib"), { recursive: true });
        writeFileSync(
          join(root, "packages/lib/package.json"),
          JSON.stringify({
            name: "@example/lib",
            version: "0.1.0",
          }),
        );
        const output = join(root, "output");
        const run = spawnSync(
          process.execPath,
          ["--input-type=module", "-e", script],
          {
            cwd: root,
            encoding: "utf8",
            env: {
              ...process.env,
              MODE: mode,
              BUMP: bump,
              EXACT: "",
              EXPLICIT: "",
              PREVIOUS_TAG: previous,
              PREFIX: "@example/lib@",
              DIRECTORY: "packages/lib",
              INITIAL: "0.1.0",
              GITHUB_OUTPUT: output,
            },
          },
        );
        expect(run.status, run.stderr).toBe(0);
        expect(readFileSync(output, "utf8")).toContain(
          "version=" + expected + "\n",
        );
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  );
});
