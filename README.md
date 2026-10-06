# Reusable Workflows

Reusable GitHub Actions workflows and standalone actions for Moya repositories.

This repository uses the published `@moyarich/workspace-tools` package for workspace discovery, releases, publishing, dependency checks, and related repository automation.

## Usage

Pin an immutable release when reproducibility matters:

```yaml
jobs:
  ci:
    uses: moyarich/reusable-workflows/.github/workflows/reusable_node-ci.yml@v0.1.0
```

Or follow the latest compatible `0.x` release:

```yaml
jobs:
  ci:
    uses: moyarich/reusable-workflows/.github/workflows/reusable_node-ci.yml@v0
```

Standalone actions use the same release line:

```yaml
- uses: moyarich/reusable-workflows/actions/discover-packages@v0
```

## Versioning

- `v0.1.0` is immutable.
- `v0` is the moving compatible major alias.
- `CHANGELOG.md` covers only user-facing workflow and action capabilities.

The npm/CLI implementation is released separately as `@moyarich/workspace-tools`.


## Workspace Tools source

Reusable workflows that need Workspace Tools default to the published package:

```yaml
with:
  workspace-tools-source: package
  workspace-tools-version: "0.1.0"
```

The `workspace-tools` repository itself uses the current checked-out caller source instead:

```yaml
with:
  workspace-tools-source: caller
```

In caller mode the workflow verifies that the checked-out root package is `@moyarich/workspace-tools`, builds the current checkout, and runs the CLIs from `dist/bin`. This lets Workspace Tools test and release CLI changes before that version has been published.

The dependency direction remains one-way for normal consumers:

```text
consumer
  ↓
moyarich/reusable-workflows
  ↓
@moyarich/workspace-tools
```
