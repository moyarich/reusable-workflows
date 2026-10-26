import { test, assert } from "vitest";
import { assertRun } from "../../src/workflow-dispatch/dispatch-rules.ts";
const sha = "a".repeat(40);
const run = {
  id: 123,
  event: "workflow_dispatch",
  path: ".github/workflows/checks.yml",
  head_sha: sha,
  head_branch: "main",
  status: "completed",
  conclusion: "success",
  html_url: "https://github.com/example/run/123",
};
test("only accepts matching run identity", () => {
  assert.strictEqual(
    assertRun(run, { id: 123, sha, branch: "main", workflow: "checks.yml" }),
    run,
  );
  assert.throws(
    () =>
      assertRun(
        { ...run, id: 124 },
        { id: 123, sha, branch: "main", workflow: "checks.yml" },
      ),
    /match/,
  );
});
