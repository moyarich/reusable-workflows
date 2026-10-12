# Reusable Workflows

Reusable GitHub Actions workflows and actions for CI, releases, publishing, and repository automation.

Configure common development and release tasks once and reuse them across repositories. Features include Node.js CI, GitHub Pages deployment, release drafting, package publishing, automated maintenance, and release recovery.

## Quick start

Call a reusable workflow from your repository's `.github/workflows/` directory:

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  ci:
    uses: moyarich/reusable-workflows/.github/workflows/reusable_node-ci.yml@v0
```

Use a published version tag (for example, `@v0.2.0`) to pin a specific release, or the `@v0` major tag to receive compatible updates.

## Explore

- [Getting started](docs/01-getting-started/page.mdx) — setup and first workflow
- [Available workflows](docs/02-workflows/page.mdx) — choose a workflow for your task
- [Workflow reference](docs/03-reference/01-workflows/page.mdx) — configuration and inputs
- [Examples](examples/) — copyable workflow examples
- [Release Drafter guide](docs/release-drafter-dispatch.md) — release draft options
- [CI self-healing example](examples/ci-self-heal/page.mdx) — guided CI recovery

## More information

See the [changelog](CHANGELOG.md) and [GitHub Releases](https://github.com/moyarich/reusable-workflows/releases) for version history. Repository maintenance and advanced workflow configuration are documented in [maintainer notes](docs/04-development/04-maintainer-and-advanced-workflows/page.mdx).
