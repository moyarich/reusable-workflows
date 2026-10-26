import { pathToFileURL } from "node:url";
import { assertRun, normalizeWorkflowInputs, parseRequiredWorkflows, } from "./dispatch-rules.js";
import { appendFileSync, realpathSync } from "node:fs";
const env = (name) => process.env[name] ?? "";
const apiRoot = "https://api.github.com";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export async function dispatchAndWait({ repository, workflow, branch, sha, token, inputs = {}, timeoutSeconds = 300, pollSeconds = 15, request = fetch, pause = sleep, root = env("GITHUB_API_URL") || apiRoot, }) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(repository))
        throw new Error("Invalid repository");
    if (!/^[\w.-]+\.ya?ml$/.test(workflow))
        throw new Error("Invalid workflow filename");
    if (!/^[0-9a-f]{40}$/i.test(sha))
        throw new Error("Invalid healed SHA");
    if (!branch)
        throw new Error("Missing branch");
    if (!(timeoutSeconds > 0 && pollSeconds > 0))
        throw new Error("Polling values must be positive");
    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
    };
    const base = `${root}/repos/${repository}`;
    const dispatched = await request(`${base}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ref: branch, inputs, return_run_details: true }),
    });
    if (!dispatched.ok)
        throw new Error(`Workflow dispatch failed: HTTP ${dispatched.status}`);
    let details;
    try {
        details = (await dispatched.json());
    }
    catch {
        throw new Error("Dispatch API did not return run details");
    }
    const id = Number(details.workflow_run_id);
    if (!Number.isSafeInteger(id) || id <= 0)
        throw new Error("Dispatch did not return workflow_run_id; cannot safely correlate run");
    const deadline = Date.now() + timeoutSeconds * 1000;
    let failures = 0;
    while (true) {
        let run;
        try {
            const response = await request(`${base}/actions/runs/${id}`, { headers });
            if (!response.ok)
                throw new Error(`Run lookup HTTP ${response.status}`);
            failures = 0;
            run = (await response.json());
        }
        catch (error) {
            if (++failures >= 3)
                throw error;
        }
        if (run)
            assertRun(run, { id, sha, branch, workflow });
        if (run?.status === "completed") {
            if (run.conclusion !== "success")
                throw new Error(`Required workflow ${id} concluded ${run.conclusion}`);
            return {
                id,
                url: run.html_url || details.html_url || "",
                conclusion: run.conclusion,
            };
        }
        if (Date.now() >= deadline)
            throw new Error(`Required workflow ${id} timed out after ${timeoutSeconds}s`);
        await pause(Math.min(pollSeconds * 1000, Math.max(0, deadline - Date.now())));
    }
}
export async function dispatchRequiredWorkflows(options) {
    const names = parseRequiredWorkflows(options.required_workflows);
    const results = [];
    for (const workflow of names) {
        const result = await dispatchAndWait({
            ...options,
            workflow,
            inputs: options.workflow_inputs?.[workflow] ?? options.inputs ?? {},
        });
        results.push({ workflow, ...result });
    }
    return results;
}
const isMain = !!process.argv[1] &&
    import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
if (isMain) {
    try {
        const results = await dispatchRequiredWorkflows({
            repository: env("GITHUB_REPOSITORY"),
            required_workflows: env("REQUIRED_WORKFLOWS"),
            branch: env("DISPATCH_BRANCH"),
            sha: env("DISPATCH_SHA"),
            token: env("GH_TOKEN"),
            workflow_inputs: normalizeWorkflowInputs(env("WORKFLOW_INPUTS"), env("DISPATCH_SHA_INPUT"), env("DISPATCH_SHA")),
            timeoutSeconds: Number(env("DISPATCH_TIMEOUT") || 300),
            pollSeconds: Number(env("DISPATCH_POLL_INTERVAL") || 15),
        });
        if (env("GITHUB_OUTPUT"))
            appendFileSync(env("GITHUB_OUTPUT"), `workflow-results=${JSON.stringify(results)}\n`);
        if (env("GITHUB_STEP_SUMMARY"))
            appendFileSync(env("GITHUB_STEP_SUMMARY"), "## Required workflow runs\n\n" +
                results
                    .map((r) => `- [${r.workflow}](${r.url}): **${r.conclusion}**\n`)
                    .join(""));
    }
    catch (error) {
        console.error(`::error::${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
    }
}
