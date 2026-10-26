import { test, assert } from "vitest";
import {
  selectRun,
  validateRun,
} from "../../verify-workflow-runs/select-run.ts";
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
test("most recent failed run blocks older successful run", () => {
  const run = selectRun(
    [
      matching(),
      matching({
        id: 42,
        created_at: "2026-10-20T01:00:00Z",
        conclusion: "failure",
      }),
    ],
    { path, sha, branch: "release/prepare-test", event: "pull_request" },
  );
  assert.throws(() => validateRun(run, path), /failure/);
});
