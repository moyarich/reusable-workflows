# Copy files to another repository

Generated composite action at `moyarich/reusable-workflows/actions/copy-files-to-another-repository@main`.

Copies an already-prepared directory tree to an existing destination branch, preserving relative paths. Compares staged changes, skips unchanged commits, and provides a dry-run summary. It never deletes destination files absent from the source. Source preparation, selection, YAML overrides and validation are handled by the caller.

```yaml
- uses: moyarich/reusable-workflows/actions/copy-files-to-another-repository@main
  with:
    token: ${{ secrets._WORKFLOW_TOKEN }}
    source-repository: moyarich/reusable-workflows-callers
    source-ref: main
    mode: pull-request
    source-directory: ${{ runner.temp }}/generated
    destination-repository: moyarich/console
    destination-branch: main
    dry-run: "true"
```

The token must have permission to edit workflow files on the destination. The source directory must contain only files that should be copied. Do not pass a whole repository checkout. For production, pin a tested action SHA instead of `@main`. The default `pull-request` mode pushes to a dedicated synchronization branch and creates or reuses an open pull request. Set `mode: update-branch` to commit directly to the destination branch. Dry runs never push or create pull requests. The token also needs pull-request write access in pull-request mode.
