import { test, assert } from "vitest";
import { dispatchRequiredWorkflows } from "../../src/workflow-dispatch/workflow-dispatch.ts";
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
