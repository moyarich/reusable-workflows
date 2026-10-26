import { test, assert } from "vitest";
import { dispatchAndWait } from "../../src/workflow-dispatch/workflow-dispatch.ts";
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
