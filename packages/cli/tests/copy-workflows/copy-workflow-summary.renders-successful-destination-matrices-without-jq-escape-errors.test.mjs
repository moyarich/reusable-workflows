import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { parse } from "yaml";

const workflow = parse(
  readFileSync(
    new URL(
      "../../../../.github/workflows/reusable_copy-files-to-another-repository.yml",
      import.meta.url,
    ),
    "utf8",
  ),
);
const summary = workflow.jobs.plan.steps.find(
  (step) => step.name === "Summarize copy plan",
);
let root;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "copy-plan-summary-"));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));
function run(env) {
  const file = join(root, "summary.md");
  const result = spawnSync(
    "bash",
    ["-e", "-o", "pipefail", "-c", summary.run],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_STEP_SUMMARY: file,
        TARGET: "",
        WORKFLOW: "",
        DRY_RUN: "true",
        MODE: "pull-request",
        SOURCE: "example/source",
        ...env,
      },
    },
  );
  return { ...result, summary: readFileSync(file, "utf8") };
}
describe("copy workflow planning summary", () => {
  it("renders successful destination matrices without jq escape errors", () => {
    const result = run({
      PLAN_RESULT: "success",
      MATRIX: JSON.stringify({
        include: [{ name: "example/destination", branch: "main" }],
      }),
    });
    expect(result.status).toBe(0);
    expect(result.summary).toContain("| `example/destination` | `main` |");
  });
});
