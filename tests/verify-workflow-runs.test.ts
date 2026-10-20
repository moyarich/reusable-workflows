import { test } from "vitest";
import assert from "node:assert/strict";
import {
  selectRun,
  validateRun,
  verify,
} from "../src/verify-workflow-runs/index.mjs";

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
  assert.equal(match.id, 41);
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

test("incomplete latest run blocks approval", () => {
  assert.throws(
    () =>
      validateRun(matching({ status: "in_progress", conclusion: null }), path),
    /in_progress/,
  );
  assert.throws(() => validateRun(undefined, path), /No matching run/);
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
  assert.equal(result[0].id, 41);
  assert.equal(result[0].conclusion, "success");
});

test("invalid inputs fail closed", async () => {
  await assert.rejects(
    verify({
      workflows: ["../ci.yml"],
      repository: "example/repo",
      sha,
      branch: "main",
      event: "pull_request",
      apiRoot: "https://api.github.com",
      token: "test",
      request: async () => {
        throw Error("should not call API");
      },
    }),
    /Required workflow paths/,
  );
});
