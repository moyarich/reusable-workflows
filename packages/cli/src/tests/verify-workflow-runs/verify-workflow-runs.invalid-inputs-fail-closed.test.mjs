import { test, expect } from "vitest";
import { verify } from "../../verify-workflow-runs/index.ts";
const sha = "a".repeat(40);
test("invalid inputs fail closed", async () => {
  await expect(
    verify({
      workflows: ["../../../ci.yml"],
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
  ).rejects.toThrow(/Required workflow paths/);
});
