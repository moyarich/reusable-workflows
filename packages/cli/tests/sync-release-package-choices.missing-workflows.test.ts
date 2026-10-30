import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";

const workflowPath = resolve(
  ".github/workflows/reusable_sync-release-package-choices.yml",
);
const workflow = parse(readFileSync(workflowPath, "utf8")) as {
  jobs: Record<string, { steps: Array<{ name?: string; run?: string }> }>;
};
const step = Object.values(workflow.jobs)
  .flatMap((job) => job.steps ?? [])
  .find((item) => item.name === "Commit changed package choices");
if (!step?.run)
  throw new Error("Commit changed package choices step not found");
const script = step.run;

describe("release choice sync commit missing workflow handling", () => {
  const execute = (files: string[], existing: string[]) => {
    const dir = mkdtempSync(join(tmpdir(), "sync-choices-missing-"));
    try {
      execFileSync("git", ["init", "-q", dir]);
      execFileSync("git", ["-C", dir, "config", "user.name", "Test"]);
      execFileSync("git", [
        "-C",
        dir,
        "config",
        "user.email",
        "test@example.com",
      ]);
      for (const name of existing) {
        const full = join(dir, name);
        mkdirSync(join(full, ".."), { recursive: true });
        writeFileSync(full, "name: Test\n");
      }
      execFileSync("git", ["-C", dir, "add", "."]);
      execFileSync("git", [
        "-C",
        dir,
        "commit",
        "--allow-empty",
        "-qm",
        "Initial",
      ]);
      const output = join(dir, "output.txt");
      writeFileSync(output, "");
      const result = spawnSync("bash", ["-e", "-c", script], {
        cwd: dir,
        encoding: "utf8",
        env: {
          ...process.env,
          WORKFLOW_FILE: files[0] ?? "",
          WORKFLOW_FILES: JSON.stringify(files),
          GITHUB_OUTPUT: output,
          WORKFLOW_TOKEN: "",
        },
      });
      return {
        status: result.status,
        stdout: result.stdout,
        stderr: result.stderr,
        output: readFileSync(output, "utf8"),
      };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  it("warns for a missing file and succeeds if a tracked workflow is unchanged", () => {
    const present = ".github/workflows/release.yml";
    const missing = ".github/workflows/optional-task.yml";
    const result = execute([missing, present], [present]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("::warning title=Workflow skipped::");
    expect(result.stdout).toContain(missing);
    expect(result.output).toContain("result=unchanged");
  });

  it("warns and succeeds when every workflow is missing", () => {
    const result = execute([".github/workflows/optional-task.yml"], []);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("::warning title=Workflow skipped::");
    expect(result.stdout).toContain("::notice title=No workflows to commit::");
    expect(result.output).toContain("result=unchanged");
  });
});
