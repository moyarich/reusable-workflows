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
