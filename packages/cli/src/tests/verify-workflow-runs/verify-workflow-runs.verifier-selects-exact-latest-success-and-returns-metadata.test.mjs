import { test, assert } from "vitest";
import { verify } from "../../verify-workflow-runs/index.ts";
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
test("verifier selects exact latest success and returns metadata", async () => {
  const request = async () => ({
    ok: true,
    json: async () => ({ workflow_runs: [matching()] }),
  });
  const result = await verify({
    workflows: [path],
    repository: "example/repo",
    sha,
    branch: "release/prepare-test",
    event: "pull_request",
    apiRoot: "https://api.github.com",
    token: "test",
    request,
  });
  assert.strictEqual(result[0].id, 41);
  assert.strictEqual(result[0].conclusion, "success");
});
