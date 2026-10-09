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

See [Release Drafter manual dispatch and version selection](docs/release-drafter-dispatch.md) for the version-mode reference table and planned compact dispatch inputs.

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

CLI migration: the next `@moyarich/workspace-tools` release uses named package selectors (`--package`) rather than positional arguments. The changes in this repository's CLI invocation workflows require that newer package; deploy them only after the new CLI version has been published, or use `workspace-tools-source: caller` while testing the unreleased CLI.

The dependency direction remains one-way for normal consumers:

```text
consumer
  ↓
moyarich/reusable-workflows
  ↓
@moyarich/workspace-tools
```


## Playground

The GitHub Pages site is built from `apps/playground`. It renders the authoritative repository-level `docs/` and `examples/` content directly, including the real caller YAML and reusable workflow source used by each example.

Run it locally with:

```sh
npm install
npm run dev
```

## Release workflow parameter summaries

The reusable npm release, npm publish, npm prepare-release, GitHub Release, and
release-drafter workflows display their effective workflow inputs in a separate
GitHub Actions job summary **by default**, including when invoked by another
repository via `workflow_call`. Consumers do not need to copy a summary job.
Inputs are read as passed; the summary does not change release configuration
or replace operational results.

Sensitive-looking input **names** are automatically excluded by the shared
summary renderer. GitHub Actions secrets must still be passed as secrets,
not as ordinary workflow inputs.

If a caller already reports the same parameters once (for example, when one
manual workflow orchestrates multiple reusable workflows), disable only the
additional reusable summary:

```yaml
jobs:
  release:
    uses: moyarich/reusable-workflows/.github/workflows/reusable_npm-release.yml@v0
    with:
      package: .
      show-input-summary: false
```

Each workflow continues to write its existing release status, tag, version,
artifact, or draft content in its operational job summary. No caller inputs
or GitHub Actions step summaries are overwritten.

## Reset and restore releases from any repository

Call these workflows directly from a repository that contains an npm `package.json`
and changelog. The implementation and GitHub Actions summaries live here,
not in the consuming repository. Both workflows default to dry-run.

```yaml
jobs:
  reset:
    permissions:
      contents: write
      packages: read
      pull-requests: read
    uses: moyarich/reusable-workflows/.github/workflows/reusable_reset-release.yml@main
    with:
      package: .
      target-branch: main
      match-mode: package-json
      dry-run: true
```

```yaml
jobs:
  restore:
    permissions:
      actions: read
      contents: write
      packages: read
      pull-requests: read
    uses: moyarich/reusable-workflows/.github/workflows/reusable_restore-release.yml@main
    with:
      package: .
      target-branch: main
      restore-source: commit:0123456789abcdef0123456789abcdef01234567
      match-mode: package-json
      dry-run: true
```

For exact matching, set `match-mode: exact` and supply `exact-tag`. The tag
must match the package's canonical identity. Restore supports commit, tag,
workflow run, artifact, and supported GitHub URL sources using the published
`@moyarich/workspace-tools` identity CLI. Repository callers do not need to
build that CLI locally. Authenticate to GitHub Packages using the standard
`GITHUB_TOKEN` permissions. Do not enable destructive mode until the dry-run
reports the expected tag, commit and registry state.

### Consumer-specific draft templates

Reset and Restore accept optional `draft-template-path`. By default it uses `.github/release-drafter-template.yml`, resolved from the caller if present or from the reusable-workflows repository at the matching workflow ref.
If your repository uses a custom Release Drafter template, pass its path explicitly:

```yaml
with:
  package: .
  target-branch: main
  draft-template-path: .github/release-drafter-package-template.yml
  dry-run: true
```

The shared tag-move workflow uses the calling repository's checkout credentials,
rather than constructing a token-bearing Git command. Grant the calling job
`contents: write` when moving tags.

## Portable npm release defaults

Manually dispatched npm release, publish and prepare workflows default to the root package (`.`). Release and Publish support an optional target branch; when absent, the selected dispatch ref is used. Explicit `workflow_call` inputs retain precedence.

## Prettier self-heal configuration

The `reusable_prettier.yml` workflow reads the consuming repository's
`devDependencies.prettier` version and respects its `.prettierignore`.
Protected `.github/workflows/` and generated `dist/` paths are always excluded,
including from auto-commits.

Use `prettier-config: this-repository` (the default) to let Prettier discover the
consumer's existing configuration. Choose `prettier-config: reusable-workflows` to
apply `reusable-configurations/.prettierrc.json` from this repository while
still honoring the consumer's ignore patterns:

```yaml
jobs:
  formatting:
    permissions:
      contents: write
    uses: moyarich/reusable-workflows/.github/workflows/reusable_prettier.yml@main
    with:
      mode: check
      prettier-config: reusable-workflows
      commit: false
      node-version: "24"
```

The `reusable-workflows` option explicitly overrides the caller's formatting rules;
the `this-repository` option never pulls a remote configuration. Both modes use the
same ignore merging and safe commit behavior.

Use `mode: check` for a read-only CI formatting gate and `mode: fix` to run
`prettier --write`. Only `mode: fix` can commit changes, and only when
`commit: true`. The workflow installs dependencies with `npm ci --ignore-scripts`
and invokes the consumer's lockfile-resolved `node_modules/.bin/prettier`.
It does not invoke autofix.ci or fetch an unpinned Prettier version.
