import { test, assert } from "vitest";
import { selectRun } from "../../verify-workflow-runs/select-run.ts";
const sha = "a".repeat(40);
const path = ".github/workflows/ci.yml";
const matching = (overrides = {}) => ({
  id: 41,
  path,
  head_sha: sha,
  head_branch: "release/prepare-test",
  event: "pull_request",
  status: "completed",
  conclusion: "success",
  created_at: "2026-10-20T00:00:00Z",
  run_attempt: 1,
  html_url: "https://github.com/example/repo/actions/runs/41",
  ...overrides,
});
test("exact workflow, branch, commit and event prevent stale approval", () => {
  const match = selectRun(
    [
      matching({ head_sha: "b".repeat(40), id: 1 }),
      matching({ head_branch: "main", id: 2 }),
      matching({ event: "push", id: 3 }),
      matching({ path: ".github/workflows/other.yml", id: 4 }),
      matching(),
    ],
    { path, sha, branch: "release/prepare-test", event: "pull_request" },
  );
  assert.strictEqual(match.id, 41);
});
