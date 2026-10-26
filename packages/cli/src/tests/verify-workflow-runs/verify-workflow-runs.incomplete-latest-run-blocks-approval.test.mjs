import { test, assert } from "vitest";
import { validateRun } from "../../verify-workflow-runs/select-run.ts";
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
test("incomplete latest run blocks approval", () => {
  assert.throws(
    () =>
      validateRun(matching({ status: "in_progress", conclusion: null }), path),
    /in_progress/,
  );
  assert.throws(() => validateRun(undefined, path), /No matching run/);
});
