import { appendFileSync } from "node:fs";

const input = (key) => (process.env[key] ?? "").trim();
const workflows = input("VERIFY_WORKFLOWS").split(",").map((s) => s.trim());
const repository = input("GITHUB_REPOSITORY");
const token = input("GH_TOKEN");
const sha = input("VERIFY_SHA");
const branch = input("VERIFY_BRANCH");
const event = input("VERIFY_EVENT") || "pull_request";
const apiRoot = process.env.GITHUB_API_URL || "https://api.github.com";

export function selectRun(runs, { path, sha, branch, event }) {
  return runs
    .filter((run) => run.path === path && run.head_sha === sha &&
      run.head_branch === branch && run.event === event)
    .sort((a, b) => a.created_at.localeCompare(b.created_at) ||
      a.run_attempt - b.run_attempt || a.id - b.id).at(-1);
}

export function validateRun(run, path) {
  if (!run) throw new Error(`No matching run for ${path}`);
  if (run.status !== "completed" || run.conclusion !== "success")
    throw new Error(`Latest run for ${path} is ${run.status}/${run.conclusion ?? "pending"}`);
  return run;
}

export async function verify({ workflows, repository, token, sha, branch, event, apiRoot, request = fetch }) {
  if (!repository.match(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/)) throw new Error("Invalid repository");
  if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error("Invalid exact commit SHA");
  if (!branch) throw new Error("Branch is required");
  if (!workflows.length || workflows.some((w) => !/^\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml$/.test(w)))
    throw new Error("Required workflow paths must be .github/workflows/*.yml or *.yaml");
  const output = [];
  for (const path of workflows) {
    const name = path.split("/").at(-1);
    const runs = [];
    for (let page = 1; ; page++) {
      const url = new URL(`${apiRoot}/repos/${repository}/actions/workflows/${name}/runs`);
      url.searchParams.set("event", event);
      url.searchParams.set("head_sha", sha);
      url.searchParams.set("per_page", "100");
      url.searchParams.set("page", String(page));
      const response = await request(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      });
      if (!response.ok) throw new Error(`GitHub API returned ${response.status} for ${path}`);
      const batch = (await response.json()).workflow_runs ?? [];
      runs.push(...batch);
      if (batch.length < 100) break;
    }
    const run = validateRun(selectRun(runs, { path, sha, branch, event }), path);
    output.push({ path, id: run.id, url: run.html_url, conclusion: run.conclusion, head_sha: run.head_sha, attempt: run.run_attempt });
  }
  return output;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try {
    const results = await verify({ workflows, repository, token, sha, branch, event, apiRoot });
    const resultJson = JSON.stringify(results);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `result-json=${resultJson}\n`);
    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY,
        "## Required workflow verification\n\n" + results.map((r) => `- [${r.path}](${r.url}): **${r.conclusion}** on \`${r.head_sha}\`\n`).join(""));
    }
  } catch (error) {
    console.error(`::error::${error.message}`);
    process.exitCode = 1;
  }
}
