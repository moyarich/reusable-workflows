# Release preparation for npm workspaces

Two new reusable workflows:

1. reusable_prepare-release-pr.yml selects publishable npm workspaces, bumps versions, updates internal dependency ranges and the lockfile, and creates a reviewed release PR. The proposed manifest is uploaded as an Actions artifact, not committed.
2. reusable_verify-release-preparation.yml derives the final approved package versions from the merged changes to publishable workspace package.json files. Manual changes made to the PR are therefore respected.

## Caller example: Console

Create a manual prepare-release.yml workflow in the calling repository:

~~~yaml
name: Prepare Release
on:
  workflow_dispatch:
    inputs:
      package:
        type: string
        default: all
      version-bump:
        type: choice
        options: [patch, minor, major]
        default: patch
      dry-run:
        type: boolean
        default: true
permissions: {}
jobs:
  prepare:
    permissions:
      contents: write
      pull-requests: write
    uses: moyarich/reusable-workflows/.github/workflows/reusable_prepare-release-pr.yml@main
    with:
      package: ${{ inputs.package }}
      version-bump: ${{ inputs.version-bump }}
      dry-run: ${{ inputs.dry-run }}
    secrets:
      workflow-token: ${{ secrets._WORKFLOW_TOKEN }}
~~~

Use a GitHub App installation token or PAT with contents/pull-request write permissions. A PR pushed using only the default GITHUB_TOKEN does not trigger ordinary PR CI; a dedicated workflow-token enables CI. No token is required in dry-run.

Create a merge trigger in the calling repository:

~~~yaml
name: Validate Merged Release
on:
  pull_request:
    types: [closed]
    branches: [main]
permissions: {}
jobs:
  validate:
    if: ${{ github.event.pull_request.merged && startsWith(github.event.pull_request.head.ref, 'release/prepare-') }}
    permissions:
      contents: read
    uses: moyarich/reusable-workflows/.github/workflows/reusable_verify-release-preparation.yml@main
~~~

## Publication boundary

These two workflows prepare and verify; they intentionally do NOT automatically release or publish yet. The follow-up orchestration must gate publication on the validated merge SHA and exact approved package set, then reuse the existing workspace release and staged npm publish jobs. Never publish all workspace packages for a PR that approved only a subset. Keep manual Release and Publish workflows as recovery options.

Preparation is reviewable and uses a fresh branch per run; it never force-pushes a reviewed branch. Dry-run is the default.

## Updating an existing release PR

The proposed manifest artifact is informational and may become stale after manually editing the PR. Never publish directly from that artifact. The merge verifier derives approved package versions from the **final merged package.json changes** so manual amendments take precedence. Release branches may be updated from main; changes must pass CI again. The verifier compares the final merged tree directly against the PR base SHA reported by GitHub, excluding unrelated main-branch changes. End-to-end validation is still required for squash, merge-commit, and rebase strategies before production activation.
