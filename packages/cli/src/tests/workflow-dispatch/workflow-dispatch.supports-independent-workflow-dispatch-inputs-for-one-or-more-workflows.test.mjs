import { test, assert } from "vitest";
import { normalizeWorkflowInputs } from "../../workflow-dispatch/dispatch-rules.ts";
import { dispatchRequiredWorkflows } from "../../workflow-dispatch/workflow-dispatch.ts";
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
test("supports independent workflow_dispatch inputs for one or more workflows", async () => {
  const expected = ["alpha.yml", "beta.yaml"];
  const received = [];
  let count = 0;
  const results = await dispatchRequiredWorkflows({
    ...config,
    required_workflows: expected.join(","),
    workflow_inputs: normalizeWorkflowInputs(
      '{"alpha.yml":{"mode":"fast","dry-run":true},"beta.yaml":{"mode":"full","count":2}}',
      "",
      sha,
    ),
    request: async (url, init) => {
      if (init?.method === "POST") {
        received.push(JSON.parse(init.body).inputs);
        return response({ workflow_run_id: ++count });
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
  assert.deepEqual(received, [
    { mode: "fast", "dry-run": "true" },
    { mode: "full", count: "2" },
  ]);
  assert.strictEqual(results.length, 2);
});
