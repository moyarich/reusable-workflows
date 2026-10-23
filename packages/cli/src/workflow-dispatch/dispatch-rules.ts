/** Pure parsing and verification for workflow dispatch. */
export type WorkflowRun = {
  id: number;
  event: string;
  path: string;
  head_sha: string;
  head_branch: string;
  status: string;
  conclusion?: string;
  html_url?: string;
};
export function normalizeInputs(json: string, shaInput: string, sha: string) {
  const values = JSON.parse(json || "{}");
  if (!values || Array.isArray(values) || typeof values !== "object")
    throw new Error("Workflow inputs must be a JSON object");
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    )
      throw new Error(`Input ${key} must be a string, number or boolean`);
    normalized[key] = String(value);
  }
  if (shaInput) {
    if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(shaInput))
      throw new Error("Invalid SHA input name");
    normalized[shaInput] = sha;
  }
  return normalized;
}

/** Parse workflow-specific workflow_dispatch inputs, keyed by workflow filename. */
export function normalizeWorkflowInputs(
  json: string,
  shaInput: string,
  sha: string,
): Record<string, Record<string, string>> {
  const value: unknown = JSON.parse(json || "{}");
  if (value === null || Array.isArray(value) || typeof value !== "object")
    throw new Error(
      "workflow_inputs must be a JSON object keyed by workflow filename",
    );
  const inputs: Record<string, Record<string, string>> = {};
  for (const [name, config] of Object.entries(value)) {
    if (!/^[\w.-]+\.ya?ml$/.test(name))
      throw new Error("Invalid workflow_inputs filename: " + name);
    inputs[name] = normalizeInputs(JSON.stringify(config), shaInput, sha);
  }
  return inputs;
}

export function assertRun(
  run: WorkflowRun,
  {
    id,
    sha,
    branch,
    workflow,
  }: { id: number; sha: string; branch: string; workflow: string },
) {
  if (
    run.id !== id ||
    run.event !== "workflow_dispatch" ||
    run.path !== `.github/workflows/${workflow}` ||
    run.head_sha !== sha ||
    run.head_branch !== branch
  )
    throw new Error(
      "Dispatched run ID, workflow, branch or SHA does not match",
    );
  return run;
}

export function parseRequiredWorkflows(required_workflows: string): string[] {
  const names = required_workflows
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  if (!names.length || names.some((name) => !/^[\w.-]+\.ya?ml$/.test(name)))
    throw new Error("Provide one or more valid workflow filenames");
  if (new Set(names).size !== names.length)
    throw new Error("Duplicate workflow filenames are not allowed");
  return names;
}
