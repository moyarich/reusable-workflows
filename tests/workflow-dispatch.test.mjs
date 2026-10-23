import { test, assert, expect } from "vitest";
import {
  normalizeInputs,
  assertRun,
  dispatchAndWait,
  parseRequiredWorkflows,
  dispatchRequiredWorkflows,
} from "../packages/cli/src/workflow-dispatch/workflow-dispatch.ts";

const sha = "a".repeat(40);
const config = {
  repository: "moyarich/example",
  workflow: "checks.yml",
  branch: "main",
  sha,
  token: "test",
};
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
const response = (data, status = 200) => ({
  ok: status < 300,
  status,
  json: async () => data,
});

test("normalizes scalar dispatch inputs and injects SHA", () => {
  assert.deepEqual(
    normalizeInputs('{"yes":true,"count":2}', "checkout-sha", sha),
    { yes: "true", count: "2", "checkout-sha": sha },
  );
  assert.throws(
    () => normalizeInputs('{"nested":{}}', "", sha),
    /scalar|must be/,
  );
});

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

test("dispatch uses returned run ID and accepts exact successful run", async () => {
  const calls = [];
  const result = await dispatchAndWait({
    ...config,
    request: async (url, init) => {
      calls.push({ url, init });
      return calls.length === 1
        ? response({ workflow_run_id: 123 })
        : response(run);
    },
    pause: async () => {},
  });
  assert.strictEqual(result.id, 123);
  assert.strictEqual(JSON.parse(calls[0].init.body).return_run_details, true);
  assert.match(calls[1].url, /actions\/runs\/123$/);
});

test("fails closed if dispatch doesn't return a run ID", async () => {
  await expect(
    dispatchAndWait({ ...config, request: async () => response({}) }),
  ).rejects.toThrow(/workflow_run_id/);
});

test("fails on non-success conclusion", async () => {
  let n = 0;
  await expect(
    dispatchAndWait({
      ...config,
      request: async () =>
        ++n === 1
          ? response({ workflow_run_id: 123 })
          : response({ ...run, conclusion: "neutral" }),
    }),
  ).rejects.toThrow(/concluded neutral/);
});

test("fails closed on another run's SHA", async () => {
  let n = 0;
  await expect(
    dispatchAndWait({
      ...config,
      request: async () =>
        ++n === 1
          ? response({ workflow_run_id: 123 })
          : response({ ...run, head_sha: "b".repeat(40) }),
    }),
  ).rejects.toThrow(/does not match/);
});

test("times out without cancelling the dispatched run", async () => {
  let n = 0;
  await expect(
    dispatchAndWait({
      ...config,
      timeoutSeconds: 0.001,
      pollSeconds: 0.001,
      request: async () =>
        ++n === 1
          ? response({ workflow_run_id: 123 })
          : response({ ...run, status: "in_progress", conclusion: null }),
      pause: async () => new Promise((resolve) => setTimeout(resolve, 3)),
    }),
  ).rejects.toThrow(/timed out/);
});

test("accepts one or more required workflows", () => {
  assert.deepEqual(parseRequiredWorkflows("checks.yml"), ["checks.yml"]);
  assert.deepEqual(parseRequiredWorkflows("alpha.yml, beta.yaml"), [
    "alpha.yml",
    "beta.yaml",
  ]);
  assert.throws(() => parseRequiredWorkflows(""), /one or more/);
  assert.throws(() => parseRequiredWorkflows("a.yml,a.yml"), /Duplicate/);
});

test("dispatches multiple workflows and verifies each run", async () => {
  const expected = ["alpha.yml", "beta.yml"];
  let index = 0;
  const results = await dispatchRequiredWorkflows({
    ...config,
    required_workflows: expected.join(","),
    request: async (url, init) => {
      if (init?.method === "POST") {
        index++;
        return response({ workflow_run_id: index });
      }
      const id = Number(url.match(/runs\/(\d+)$/)?.[1]);
      return response({
        ...run,
        id,
        path: `.github/workflows/${expected[id - 1]}`,
      });
    },
    pause: async () => {},
  });
  assert.deepEqual(
    results.map((r) => r.workflow),
    expected,
  );
  assert.deepEqual(
    results.map((r) => r.id),
    [1, 2],
  );
});
