/** Deterministic workflow run selection and validation. */
export type WorkflowRun = {
  id: number;
  path: string;
  head_sha: string;
  head_branch: string;
  event: string;
  created_at: string;
  run_attempt: number;
  status: string;
  conclusion: string | null;
  html_url: string;
};
export type Selection = {
  path: string;
  sha: string;
  branch: string;
  event: string;
};
export function selectRun(
  runs: WorkflowRun[],
  { path, sha, branch, event }: Selection,
) {
  return runs
    .filter(
      (run) =>
        run.path === path &&
        run.head_sha === sha &&
        run.head_branch === branch &&
        run.event === event,
    )
    .sort(
      (a, b) =>
        a.created_at.localeCompare(b.created_at) ||
        a.run_attempt - b.run_attempt ||
        a.id - b.id,
    )
    .at(-1);
}

export function validateRun(run: WorkflowRun | undefined, path: string) {
  if (!run) throw new Error(`No matching run for ${path}`);
  if (run.status !== "completed" || run.conclusion !== "success")
    throw new Error(
      `Latest run for ${path} is ${run.status}/${run.conclusion ?? "pending"}`,
    );
  return run;
}
