import { describe, expect, it } from "vitest";
import { verify } from "../packages/cli/src/verify-workflow-runs/index.js";
import type { WorkflowRun } from "../packages/cli/src/verify-workflow-runs/select-run.js";

const SHA = "a".repeat(40);
const PATH = ".github/workflows/ci_cli.yml";
const BRANCH = "release/prepare-fixture";
const successfulRun = (overrides: Partial<WorkflowRun> = {}): WorkflowRun => ({
  id: 12,
  path: PATH,
  head_sha: SHA,
  head_branch: BRANCH,
  event: "pull_request",
  created_at: "2026-10-27T00:00:00Z",
  run_attempt: 1,
  status: "completed",
  conclusion: "success",
  html_url: "https://github.test/actions/runs/12",
  ...overrides,
});

function emulateRuns(pages: WorkflowRun[][]) {
  const requests: URL[] = [];
  const request: typeof fetch = async (input) => {
    const url = new URL(String(input));
    requests.push(url);
    const page = Number(url.searchParams.get("page") || "1");
    return new Response(
      JSON.stringify({ workflow_runs: pages[page - 1] ?? [] }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  };
  return { request, requests };
}

function run(request: typeof fetch) {
  return verify({
    workflows: [PATH],
    repository: "moyarich/moyaforge",
    token: "fixture-token",
    sha: SHA,
    branch: BRANCH,
    event: "pull_request",
    apiRoot: "http://127.0.0.1:4001",
    request,
  });
}

describe("GitHub workflow verification API integration", () => {
  it("selects the successful run for the exact branch, commit and event", async () => {
    const api = emulateRuns([
      [
        successfulRun({ id: 3, head_sha: "b".repeat(40) }),
        successfulRun({ id: 5, head_branch: "main" }),
        successfulRun({ id: 12 }),
      ],
    ]);
    await expect(run(api.request)).resolves.toEqual([
      {
        path: PATH,
        id: 12,
        url: "https://github.test/actions/runs/12",
        conclusion: "success",
        head_sha: SHA,
        attempt: 1,
      },
    ]);
    expect(api.requests[0]?.pathname).toBe(
      "/repos/moyarich/moyaforge/actions/workflows/ci_cli.yml/runs",
    );
    expect(api.requests[0]?.searchParams.get("head_sha")).toBe(SHA);
    expect(api.requests[0]?.searchParams.get("event")).toBe("pull_request");
  });

  it("rejects a newer failed or pending attempt instead of accepting stale success", async () => {
    const older = successfulRun();
    for (const latest of [
      successfulRun({
        id: 13,
        run_attempt: 2,
        status: "completed",
        conclusion: "failure",
      }),
      successfulRun({
        id: 13,
        run_attempt: 2,
        status: "in_progress",
        conclusion: null,
      }),
    ]) {
      const api = emulateRuns([[older, latest]]);
      await expect(run(api.request)).rejects.toThrow(/Latest run .* is /);
    }
  });

  it("rejects runs from a different commit even if successful", async () => {
    await expect(
      run(emulateRuns([[successfulRun({ head_sha: "b".repeat(40) })]]).request),
    ).rejects.toThrow("No matching run");
  });

  it("requires every designated workflow to pass", async () => {
    const second = ".github/workflows/ci_actionlint.yml";
    const request: typeof fetch = async (input) => {
      const url = new URL(String(input));
      const path = url.pathname.includes("ci_actionlint.yml") ? second : PATH;
      const status = path === second ? "failure" : "success";
      return new Response(JSON.stringify({
        workflow_runs: [successfulRun({ path, conclusion: status })],
      }), { status: 200 });
    };
    await expect(verify({
      workflows: [PATH, second],
      repository: "moyarich/moyaforge",
      token: "fixture-token",
      sha: SHA,
      branch: BRANCH,
      event: "pull_request",
      apiRoot: "http://127.0.0.1:4001",
      request,
    })).rejects.toThrow("Latest run for " + second);
  });

  it("rejects mismatched event type and workflow path", async () => {
    const api = emulateRuns([[
      successfulRun({ event: "push" }),
      successfulRun({ path: ".github/workflows/another.yml" }),
    ]]);
    await expect(run(api.request)).rejects.toThrow("No matching run");
  });

  it("surfaces GitHub API errors instead of permitting release", async () => {
    const request: typeof fetch = async () =>
      new Response("unavailable", { status: 503 });
    await expect(run(request)).rejects.toThrow("GitHub API returned 503");
  });
});
