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
