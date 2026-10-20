# Setup Workspace Tools

Composite action that resolves the `@moyarich/workspace-tools` CLI for GitHub Actions. Source selection is centralized here: reusable workflows should default their `workspace-tools-source` input to `auto`, and nested calls should forward explicit overrides unchanged.

## Default: `auto`

With `workspace-tools-source: auto` (the action's default), the action selects a source based on the **calling repository** (`github.repository`):

| Calling repository         | Source selected by `auto`       |
| -------------------------- | ------------------------------- |
| `moyarich/workspace-tools` | `checkout:current`              |
| All other repositories     | `checkout:upstream;branch:main` |

The action emits its selected source and does **not** silently fall back when an explicit source fails. For repeatable builds, pin an exact npm version or upstream commit instead of a moving `main` branch.

## Supported sources

| `workspace-tools-source`                   | Behavior                                                   |
| ------------------------------------------ | ---------------------------------------------------------- |
| `auto`                                     | Resolve by calling repository, as above (default)          |
| `checkout:current`                         | Build the Workspace Tools package in the caller's checkout |
| `checkout:upstream;branch:main`            | Fetch and build upstream `main`                            |
| `checkout:upstream;branch:<branch>`        | Fetch and build an upstream branch                         |
| `checkout:upstream;tag:<tag>`              | Fetch and build an upstream Git tag                        |
| `checkout:upstream;sha:<40-character-sha>` | Fetch and build an exact upstream commit                   |
| `registry:npm:latest`                      | Install npm's moving `latest` dist-tag                     |
| `registry:npm:<version>`                   | Install a pinned npm package version                       |

## Usage in a reusable workflow

A reusable workflow can expose an optional override without implementing repository-specific checks.

```yaml
on:
  workflow_call:
    inputs:
      workspace-tools-source:
        type: string
        required: false
        default: auto

jobs:
  discover:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v7
      - name: Setup Workspace Tools
        id: workspace-tools
        uses: moyarich/reusable-workflows/actions/setup-workspace-tools@main
        with:
          workspace-tools-source: ${{ inputs.workspace-tools-source }}
      - name: Discover packages
        env:
          BIN_DIR: ${{ steps.workspace-tools.outputs.bin-dir }}
        run: node "$BIN_DIR/discover-packages.mjs" --workspaces --json
```

If the reusable workflow already defaults to `auto`, a caller can omit `workspace-tools-source` entirely:

```yaml
jobs:
  discover:
    permissions:
      contents: read
    uses: moyarich/reusable-workflows/.github/workflows/reusable_discover-packages.yml@main
    with:
      use-workspaces: true
      require-publish-config: false
```

## Optional manual override

A `workflow_dispatch` choice provides convenient overrides, without duplicating the repository-specific resolution expression:

```yaml
on:
  workflow_dispatch:
    inputs:
      workspace-tools-source:
        description: Workspace Tools CLI source
        type: choice
        required: true
        default: auto
        options:
          - auto
          - checkout:current
          - checkout:upstream;branch:main
          - registry:npm:latest

jobs:
  discover:
    permissions:
      contents: read
    uses: moyarich/reusable-workflows/.github/workflows/reusable_discover-packages.yml@main
    with:
      workspace-tools-source: ${{ inputs.workspace-tools-source }}
```

GitHub Actions choice options are static. To select an arbitrary npm version, Git tag, or commit SHA, provide a `type: string` input or specify the source directly in workflow YAML.

## Inputs

| Input                    | Default         | Description                                                                          |
| ------------------------ | --------------- | ------------------------------------------------------------------------------------ |
| `workspace-tools-source` | `auto`          | Automatic repository-aware resolution, or an explicit checkout / npm registry source |
| `build-command`          | `npm run build` | Command used for checkout-based sources; ignored for registry installs               |

## Outputs

| Output    | Description                                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bin-dir` | Absolute directory containing Workspace Tools CLI entry points, including `discover-packages.mjs`, `workspace-release.mjs`, and `workspace-publish.mjs` |
| `source`  | Resolved source string (for example, `checkout:current` or `checkout:upstream;branch:main`), not the literal `auto` input                               |

## Requirements and behavior

- Check out the caller repository before invoking the action when using `checkout:current` or needing repository files for subsequent CLI commands.
- `checkout:current` requires `packages/workspace-tools/package.json` in the caller checkout; the action builds it in place. Explicitly selecting it in another repository fails rather than falling back.
- Upstream checkout sources fetch `moyarich/workspace-tools` into a temporary directory and build the CLI. Use an exact SHA for reproducibility.
- Registry sources install `@moyarich/workspace-tools` globally from the public npm registry.
- The action checks for the primary release and publish entry points. Consumers should verify any additional CLI commands they require.
- Nested reusable workflows should forward the caller's selected `workspace-tools-source` rather than replacing it with their own defaults.

This action resolves CLI tooling only. Publishing credentials, package eligibility, release permissions, and authorization to modify `.github/workflows/` files remain the responsibilities of the calling workflows.
