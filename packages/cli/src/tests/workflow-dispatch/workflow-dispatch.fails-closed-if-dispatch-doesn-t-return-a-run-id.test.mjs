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
const response = (data, status = 200) => ({
  ok: status < 300,
  status,
  json: async () => data,
});
test("fails closed if dispatch doesn't return a run ID", async () => {
  await expect(
    dispatchAndWait({ ...config, request: async () => response({}) }),
  ).rejects.toThrow(/workflow_run_id/);
});
