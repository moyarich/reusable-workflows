# Reusable Workflows

Reusable GitHub Actions workflows for building, testing, releasing, publishing, and maintaining projects across repositories.

**Standardize your automation without duplicating configuration.** Use ready-made workflows for continuous integration, GitHub Pages deployment, release management, package publishing, and automated CI recovery.

## Features

- **Continuous Integration** — Run focused, independent CI checks using repository-specific `ci_*` workflows.
- **GitHub Pages** — Build and deploy documentation, playgrounds, and static sites.
- **Release Management** — Prepare release drafts, manage versioned releases, and coordinate release workflows.
- **Package Publishing** — Publish packages to supported npm registries, including multi-package workspaces.
- **CI Recovery** — Detect eligible workflow failures and support guarded, automated remediation.
- **Repository Automation** — Reuse common maintenance and development workflows across projects.
- **Workflow Caller Synchronization** — Distribute reviewed caller YAML from a source repository to allowlisted destinations using per-repository configuration and destination pull requests.

## Quick Start

Add a workflow to your repository's `.github/workflows/` directory:

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  ci:
    uses: moyarich/reusable-workflows/.github/workflows/reusable_actionlint.yml@v0
```

This example calls the reusable Actionlint workflow on pushes and pull requests.

### Versioning

Choose how your repository receives workflow updates:

- `@v0` — Follow compatible updates within the v0 release series.
- `@v0.2.2` — Pin to a specific published release.
- `@<commit-sha>` — Pin to an immutable commit for maximum reproducibility.

For additional configuration, permissions, and workflow inputs, see the [Getting Started guide](docs/01-getting-started/page.mdx).

## Documentation

**[Explore the documentation](https://moyarich.github.io/reusable-workflows/)**

| Resource                                                      | Description                                                  |
| ------------------------------------------------------------- | ------------------------------------------------------------ |
| [Getting Started](docs/01-getting-started/page.mdx)           | Set up your first reusable workflow.                         |
| [Available Workflows](docs/02-workflows/page.mdx)             | Discover workflows by purpose and capability.                |
| [Workflow Reference](docs/03-reference/01-workflows/page.mdx) | Explore supported inputs, secrets, permissions, and outputs. |
| [Examples](examples/)                                         | Browse practical, copyable workflow configurations.          |
| [Release Drafter](docs/release-drafter-dispatch/page.mdx)     | Configure release drafting and synchronization.              |
| [CI Self-Healing](examples/ci-self-heal/page.mdx)             | Explore automated CI recovery and safeguards.                |

## Copy workflow callers

This repository **owns the copier**: [`.github/copy-files-config.yml`](.github/copy-files-config.yml) identifies `moyarich/reusable-workflows-callers` as the canonical workflow source and lists each authorized destination and its overrides. [`.github/workflows/copy.yml`](.github/workflows/copy.yml) is the manually dispatched caller for [`reusable_copy-files-to-another-repository.yml`](.github/workflows/reusable_copy-files-to-another-repository.yml). The implementation and tests live under [`packages/cli/`](packages/cli/).

Dispatch **Copy canonical workflow callers** with `dry-run: true` first. Set `repository` to an `owner/repo` from the local allowlist to test one destination; leave it empty for all. With `dry-run: false`, changes are proposed as destination PRs, not pushed directly to their base branch. The central configuration **is not distributed** to destinations. Every other repository that invokes the reusable workflow must provide its own `.github/copy-files-config.yml`. See the [copy files guide](docs/02-guides/copy-files-to-another-repository.md) for inputs, overrides, safety rules, tokens, and troubleshooting.

## Releases

See the [Changelog](CHANGELOG.md) for changes between versions or browse [GitHub Releases](https://github.com/moyarich/reusable-workflows/releases) for published releases.

For contributor guidance and advanced repository configuration, see the [Maintainer Documentation](docs/04-development/04-maintainer-and-advanced-workflows/page.mdx).

## TypeScript workspaces and CLI

The npm workspace includes `packages/cli` for `@moyarich/reusable-workflows-cli` and `apps/playground`. Existing action source remains at `src/actions/*` to preserve workflow and action entry points. The CLI bundles the Commander-based browser extension publisher into a standalone npm executable.

```bash
npm run build:cli
npm run build:package
node packages/cli/dist/bin/cli.mjs --help
```

GitHub Action bundles are generated by the `@moyarich/vite-github-actions` plugin, maintained in [vite-github-actions](https://github.com/moyarich/vite-github-actions), and output to the existing `actions/dist/*.mjs` paths.

> The Git-sourced Vite plugin is used until its npm registry release is available. Publishing the CLI to npm is a separate release action.
