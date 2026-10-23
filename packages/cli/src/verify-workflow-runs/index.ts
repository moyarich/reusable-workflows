/** GitHub API and runner output adapter for workflow verification. */
import type { WorkflowRun } from "./select-run.js";
import { selectRun, validateRun } from "./select-run.js";
type VerifyOptions = {
  workflows: string[];
  repository: string;
  token: string;
  sha: string;
  branch: string;
  event: string;
  apiRoot: string;
  request?: typeof fetch;
};
import { appendFileSync } from "node:fs";

export async function verify({
  workflows,
  repository,
  token,
  sha,
  branch,
  event,
  apiRoot,
  request = fetch,
}: VerifyOptions) {
  if (!repository.match(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/))
    throw new Error("Invalid repository");
  if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error("Invalid exact commit SHA");
  if (!branch) throw new Error("Branch is required");
  if (
    !workflows.length ||
    workflows.some(
      (w) => !/^\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml$/.test(w),
    )
  )
    throw new Error(
      "Required workflow paths must be .github/workflows/*.yml or *.yaml",
    );
  const output: Array<{
    path: string;
    id: number;
    url: string;
    conclusion: string | null;
    head_sha: string;
    attempt: number;
  }> = [];
  for (const path of workflows) {
    const name = path.split("/").at(-1);
    const runs: WorkflowRun[] = [];
    for (let page = 1; ; page++) {
      const url = new URL(
        `${apiRoot}/repos/${repository}/actions/workflows/${name}/runs`,
      );
      url.searchParams.set("event", event);
      url.searchParams.set("head_sha", sha);
      url.searchParams.set("per_page", "100");
      url.searchParams.set("page", String(page));
      const response = await request(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      if (!response.ok)
        throw new Error(`GitHub API returned ${response.status} for ${path}`);
      const batch =
        ((await response.json()) as { workflow_runs?: WorkflowRun[] })
          .workflow_runs ?? [];
      runs.push(...batch);
      if (batch.length < 100) break;
    }
    const run = validateRun(
      selectRun(runs, { path, sha, branch, event }),
      path,
    );
    output.push({
      path,
      id: run.id,
      url: run.html_url,
      conclusion: run.conclusion,
      head_sha: run.head_sha,
      attempt: run.run_attempt,
    });
  }
  return output;
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
) {
  try {
    const results = await verify({
      workflows: (process.env.VERIFY_WORKFLOWS ?? "")
        .split(",")
        .map((s) => s.trim()),
      repository: (process.env.GITHUB_REPOSITORY ?? "").trim(),
      token: (process.env.GH_TOKEN ?? "").trim(),
      sha: (process.env.VERIFY_SHA ?? "").trim(),
      branch: (process.env.VERIFY_BRANCH ?? "").trim(),
      event: (process.env.VERIFY_EVENT ?? "").trim() || "pull_request",
      apiRoot: process.env.GITHUB_API_URL || "https://api.github.com",
    });
    const resultJson = JSON.stringify(results);
    if (process.env.GITHUB_OUTPUT)
      appendFileSync(process.env.GITHUB_OUTPUT, `result-json=${resultJson}\n`);
    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        "## Required workflow verification\n\n" +
          results
            .map(
              (r) =>
                `- [${r.path}](${r.url}): **${r.conclusion}** on \`${r.head_sha}\`\n`,
            )
            .join(""),
      );
    }
  } catch (error) {
    console.error(
      `::error::${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}
