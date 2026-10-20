# Setup Workspace Tools

Composite action to resolve the `@moyarich/workspace-tools` CLI for GitHub Actions workflows. Use the same **`workspace-tools-source`** input across caller and reusable workflows; forward it unchanged through nested calls.

## Source policy

| `workspace-tools-source`                   | Use case                                                           |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `registry:npm:latest`                      | Default for reusable workflows; installs the npm `latest` dist-tag |
| `registry:npm:0.2.2`                       | Example of a caller-selected, pinned npm release                   |
| `checkout:current`                         | Build from the current checkout of the Workspace Tools repository  |
| `checkout:upstream;branch:main`            | Explicitly test unreleased upstream changes                        |
| `checkout:upstream;tag:<tag>`              | Build from a specified upstream Git tag                            |
| `checkout:upstream;sha:<40-character-sha>` | Build from an exact upstream commit                                |

`registry:npm:latest` follows the npm dist-tag and may change between runs. Caller workflows can pin a tested version for reproducibility. The action does not silently fall back to a different source.

## Example: reusable workflow

```yaml
on:
  workflow_call:
    inputs:
      workspace-tools-source:
        type: string
        required: false
        default: registry:npm:latest

jobs:
  example:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - name: Resolve Workspace Tools
        id: workspace-tools
        uses: moyarich/reusable-workflows/actions/setup-workspace-tools@main
        with:
          workspace-tools-source: ${{ inputs.workspace-tools-source }}
      - name: Discover packages
        env:
          BIN_DIR: ${{ steps.workspace-tools.outputs.bin-dir }}
        run: node "$BIN_DIR/discover-packages.mjs" --workspaces --json
```

## Example: caller-selected source

```yaml
on:
  workflow_dispatch:
    inputs:
      workspace-tools-source:
        description: Choose the Workspace Tools CLI source
        type: choice
        required: true
        default: registry:npm:latest
        options:
          - registry:npm:latest
          - checkout:current
          - checkout:upstream;branch:main

jobs:
  discover:
    uses: moyarich/reusable-workflows/.github/workflows/reusable_discover-packages.yml@main
    with:
      workspace-tools-source: ${{ inputs.workspace-tools-source }}
```

GitHub Actions choice inputs have static options. For an arbitrary pinned npm version or upstream SHA, pass the exact source string through a reusable workflow input or configure it directly in the caller YAML.

## Inputs

| Input                    | Default               | Description                                                                      |
| ------------------------ | --------------------- | -------------------------------------------------------------------------------- |
| `workspace-tools-source` | `registry:npm:latest` | npm dist-tag/version, local Workspace Tools checkout, or upstream branch/tag/SHA |
| `build-command`          | `npm run build`       | Build command for checkout-based sources; not used for npm registry installs     |

## Outputs

| Output    | Description                                                                                                                             |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `bin-dir` | Absolute directory containing CLI entry points, including `discover-packages.mjs`, `workspace-release.mjs`, and `workspace-publish.mjs` |
| `source`  | Original selected source string                                                                                                         |

## Requirements and behavior

- The caller must check out its repository before running this action when needed.
- `checkout:current` requires `packages/workspace-tools/package.json` in the checked-out repository and builds it in place. Use it only in a compatible Workspace Tools checkout.
- Upstream sources fetch `moyarich/workspace-tools` into a temporary directory and build its CLI; use a Git SHA for a reproducible upstream build.
- Registry sources install `@moyarich/workspace-tools` globally from the public npm registry.
- The action checks that the resolved CLI directory contains `workspace-release.mjs` and `workspace-publish.mjs`. Individual workflows should verify additional command files they need.

The action resolves the CLI; publishing credentials, repository permissions, and authorization for modifying releases remain the responsibility of the calling workflow.
