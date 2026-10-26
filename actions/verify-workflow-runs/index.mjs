import { basename } from "node:path";
import { appendFileSync } from "node:fs";
// ../cli/src/verify-workflow-runs/select-run.ts
function selectRun(runs, { path, sha, branch, event }) {
	return runs.filter((run) => run.path === path && run.head_sha === sha && run.head_branch === branch && run.event === event).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.run_attempt - b.run_attempt || a.id - b.id).at(-1);
}
function validateRun(run, path) {
	if (!run) throw new Error(`No matching run for ${path}`);
	if (run.status !== "completed" || run.conclusion !== "success") throw new Error(`Latest run for ${path} is ${run.status}/${run.conclusion ?? "pending"}`);
	return run;
}
// ../cli/src/verify-workflow-runs/index.ts
/** GitHub API and runner output adapter for workflow verification. */
var REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
var SHA_PATTERN = /^[0-9a-f]{40}$/i;
var WORKFLOW_PATH_PATTERN = /^\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml$/;
var PAGE_SIZE = 100;
async function verify({ workflows, repository, token, sha, branch, event, apiRoot, request = fetch }) {
	if (!REPOSITORY_PATTERN.test(repository)) throw new Error("Invalid repository");
	if (!SHA_PATTERN.test(sha)) throw new Error("Invalid exact commit SHA");
	if (!branch) throw new Error("Branch is required");
	if (!workflows.length || !workflows.every((w) => WORKFLOW_PATH_PATTERN.test(w))) throw new Error("Required workflow paths must be .github/workflows/*.yml or *.yaml");
	const headers = {
		Authorization: `Bearer ${token}`,
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28"
	};
	const output = [];
	for (const path of workflows) {
		const runs = [];
		for (let page = 1;; page++) {
			const url = new URL(`${apiRoot}/repos/${repository}/actions/workflows/${basename(path)}/runs`);
			url.search = new URLSearchParams({
				event,
				head_sha: sha,
				per_page: String(PAGE_SIZE),
				page: String(page)
			}).toString();
			const response = await request(url, { headers });
			if (!response.ok) throw new Error(`GitHub API returned ${response.status} for ${path}`);
			const { workflow_runs = [] } = await response.json();
			runs.push(...workflow_runs);
			if (workflow_runs.length < PAGE_SIZE) break;
		}
		const run = validateRun(selectRun(runs, {
			path,
			sha,
			branch,
			event
		}), path);
		output.push({
			path,
			id: run.id,
			url: run.html_url,
			conclusion: run.conclusion,
			head_sha: run.head_sha,
			attempt: run.run_attempt
		});
	}
	return output;
}
async function runVerifyWorkflowRunsAction() {
	try {
		const env = process.env;
		const results = await verify({
			workflows: (env.VERIFY_WORKFLOWS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
			repository: (env.GITHUB_REPOSITORY ?? "").trim(),
			token: (env.GH_TOKEN ?? "").trim(),
			sha: (env.VERIFY_SHA ?? "").trim(),
			branch: (env.VERIFY_BRANCH ?? "").trim(),
			event: (env.VERIFY_EVENT ?? "").trim() || "pull_request",
			apiRoot: env.GITHUB_API_URL || "https://api.github.com"
		});
		if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `result-json=${JSON.stringify(results)}\n`);
		if (env.GITHUB_STEP_SUMMARY) {
			const lines = results.map((r) => `- [${r.path}](${r.url}): **${r.conclusion}** on \`${r.head_sha}\`\n`);
			appendFileSync(env.GITHUB_STEP_SUMMARY, `## Required workflow verification\n\n${lines.join("")}`);
		}
	} catch (error) {
		console.error(`::error::${error instanceof Error ? error.message : String(error)}`);
		process.exitCode = 1;
	}
}
// ../cli/src/verify-workflow-runs/action-entry.ts
await runVerifyWorkflowRunsAction();
export {};
