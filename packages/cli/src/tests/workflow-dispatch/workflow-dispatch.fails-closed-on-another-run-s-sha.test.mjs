import { test, expect } from "vitest";
import { dispatchAndWait } from "../../workflow-dispatch/workflow-dispatch.ts";
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
