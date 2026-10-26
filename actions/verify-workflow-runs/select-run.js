export function selectRun(runs, { path, sha, branch, event }) {
    return runs
        .filter((run) => run.path === path &&
        run.head_sha === sha &&
        run.head_branch === branch &&
        run.event === event)
        .sort((a, b) => a.created_at.localeCompare(b.created_at) ||
        a.run_attempt - b.run_attempt ||
        a.id - b.id)
        .at(-1);
}
export function validateRun(run, path) {
    if (!run)
        throw new Error(`No matching run for ${path}`);
    if (run.status !== "completed" || run.conclusion !== "success")
        throw new Error(`Latest run for ${path} is ${run.status}/${run.conclusion ?? "pending"}`);
    return run;
}
