# Dispatch workflow and wait

Composite action that dispatches a **different** GitHub Actions workflow, waits for its completion, and fails unless it succeeds.

```yaml
jobs:
  validate:
    runs-on: ubuntu-latest
    permissions:
      actions: write
      contents: read
    steps:
      - uses: moyarich/reusable-workflows/actions/dispatch-workflow-and-wait@main
        with:
          workflow: ci.yml
          ref: automation/ci-self-heal
          token: ${{ github.token }}
          timeout-minutes: "30"
```

The target workflow must accept `workflow_dispatch`. The action outputs `run-id`, `run-url`, `conclusion`, and `head-sha`; it appends a linked parent-run summary even when dispatch or validation fails. The child run's full job summaries and artifacts remain on the child run page.

If the branch can move during the dispatch, specify `expected-sha` and make the target workflow check out that exact SHA (for example through a `workflow_dispatch` input). A run's `head_sha` alone doesn't guarantee individual jobs checked out that SHA. Serialize parallel dispatches targeting the same workflow/ref/SHA to avoid ambiguous run matching. Do not dispatch the same workflow or create indirect workflow cycles.

The action does **not** implement the self-healing/repair stage; call it after repair has completed. GitHub's default token permissions are not sufficient unless the calling job grants `actions: write`.

## Structured workflow metadata

The `result-json` output contains a JSON object with `run`, `jobs`, and `artifacts`. These are the available GitHub REST API objects, including each job's step statuses. The action gathers them even when the dispatched workflow fails (provided its run was found). For example:

```yaml
- id: child
  uses: moyarich/reusable-workflows/actions/dispatch-workflow-and-wait@main
  continue-on-error: true
  with:
    workflow: ci.yml
    ref: main
    token: ${{ github.token }}
- if: always() && steps.child.outputs.result-json != ''
  env:
    RESULT_JSON: ${{ steps.child.outputs.result-json }}
  run: jq -n --argjson result "$RESULT_JSON" '$result.jobs | map({name, conclusion})'
```

If the JSON would exceed 250,000 characters, the action emits a warning and leaves `result-json` unset; use `run-id` to query the GitHub API instead. GitHub step summaries and logs are not included in the REST run/job/artifact responses. Callers need `actions: read` as well as dispatch permission.
