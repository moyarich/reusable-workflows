# Reusable Workflows

Reusable GitHub Actions workflows and standalone actions for Moya repositories.

Workflows provide reusable CI, package discovery, release drafting, GitHub Releases, and npm publishing. Workflows requiring CLI tooling default to `@moyarich/workspace-tools@0.2.0`.

## Usage

Use `@v0` for the latest compatible v0 release or pin `@v0.2.0` for an immutable reference. Reserve `@main` for testing unreleased changes.

```yaml
jobs:
  ci:
    uses: moyarich/reusable-workflows/.github/workflows/reusable_node-ci.yml@main
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

- `v0.1.0` and `v0.2.0` are immutable GitHub Release tags.
- `v0` is the moving compatible major alias.
- `CHANGELOG.md` covers only user-facing workflow and action capabilities.

## Repository releases versus npm package publishing

**This repository ships GitHub Actions workflows and standalone actions, not an npm package.** Its root `package.json` is private and exists only for repository development, version tracking, and the playground.

To release reusable workflows, run [`.github/workflows/release.yml`](.github/workflows/release.yml) using **Actions → Release → Run workflow**. A non-dry-run release updates the root version, publishes the immutable `vX.Y.Z` GitHub Release/tag, and advances the compatible `vX` alias if selected. Consumers use `@v0` or a pinned version such as `@v0.2.0`; no npm or GitHub Packages publication is involved.

The `reusable_npm-prepare-release.yml`, `reusable_npm-release.yml`, and `reusable_npm-publish.yml` workflows exist **for other repositories to call** via `workflow_call`. They are not part of this repository's release pipeline. The npm workflows are **separate, explicitly initiated operations**: they are not triggered by `.github/workflows/release.yml`. If you later decide to distribute an npm package from this repository, first make its intended package publishable (including reviewing `private`, package contents, registry, and authentication), then deliberately run the appropriate npm workflow. Keep `dry-run: true` until its checks pass.

The npm/CLI implementation is released separately as `@moyarich/workspace-tools`.


## Workspace Tools source

Reusable workflows that need Workspace Tools default to the published package:

```yaml
with:
  workspace-tools-source: registry:npm:0.2.0
```

The `workspace-tools` repository itself uses the current checked-out caller source instead:

```yaml
with:
  workspace-tools-source: checkout:current
```

In `checkout:current` mode the workflow verifies that the checked-out root package is `@moyarich/workspace-tools`, builds the current checkout, and runs the CLIs from `dist/bin`. This lets Workspace Tools test and release CLI changes before that version has been published.

The supported `workspace-tools-source` forms are `registry:npm:<version>`, `checkout:current`, and `checkout:upstream;branch:<branch>` (or `tag:<tag>` / `sha:<40-character-sha>`). Legacy source/ref inputs are not supported. See [Getting Started](docs/01-getting-started/page.mdx) for consumer usage.

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

Direct manual dispatches display workflow parameters. Reusable npm release and npm publish calls suppress the optional parameter-summary job by default, avoiding duplicate summaries when their caller already reports inputs. Use `show-input-summary: true` to opt in. Operational results remain available in each workflow's own summary.

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

Reset dry-runs against published versions report **blocked** without modifying releases or tags; real resets are forbidden. Restore requires a historical `restore-source` and uses Workspace Tools `0.2.0` by default. A published version should only be restored from its original source.

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
