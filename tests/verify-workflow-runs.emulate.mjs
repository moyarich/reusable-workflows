import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import { createEmulator } from "emulate";
import { verify } from "../packages/cli/src/verify-workflow-runs/index.js";

let github;
const sha = "a".repeat(40);
const repo = "moyarich/moyaforge";

beforeAll(async () => {
  github = await createEmulator({
    service: "github",
    port: 0,
    seed: {
      github: {
        users: [{ login: "moyarich" }],
        repos: [{ owner: "moyarich", name: "moyaforge", auto_init: true }],
      },
    },
  });
});
afterEach(async () => { await github.reset(); });
afterAll(async () => { await github?.close(); });

it("fails closed for missing required CI in a real stateful GitHub emulator", async () => {
  const response = await fetch(`${github.url}/repos/${repo}`);
  expect(response.status).toBe(200);

  await expect(verify({
    workflows: [".github/workflows/ci_cli.yml"],
    repository: repo,
    token: "fixture-token",
    sha,
    branch: "release/prepare-fixture",
    event: "pull_request",
    apiRoot: github.url,
  })).rejects.toThrow();

  const releases = await fetch(`${github.url}/repos/${repo}/releases`);
  expect(releases.status).toBe(200);
  expect(await releases.json()).toEqual([]);
});
