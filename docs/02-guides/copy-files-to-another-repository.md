# Copy workflow callers to another repository

This repository contains the central copier. [`moyarich/reusable-workflows-callers`](https://github.com/moyarich/reusable-workflows-callers) is the GitHub template **and canonical source of thin workflow callers**. Do not place the central destination inventory in the template: it would be inherited by new template-derived repositories.

## Ownership and files

| File                                                                                                                                       | Responsibility                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| [`.github/copy-files-config.yml`](../../.github/copy-files-config.yml)                                                                     | This repository's **private-to-this-repository configuration**: source, destination allowlist and overrides; it is not propagated |
| [`.github/workflows/copy.yml`](../../.github/workflows/copy.yml)                                                                           | Manual dispatch caller using this repository's configuration and `_WORKFLOW_TOKEN`                                                |
| [`.github/workflows/reusable_copy-files-to-another-repository.yml`](../../.github/workflows/reusable_copy-files-to-another-repository.yml) | Reusable workflow: validates configuration, selects destinations and generates per-repository YAML                                |
| [`packages/cli/`](../../packages/cli/)                                                                                                     | Copier implementation, selection logic, and tests                                                                                 |
| [`actions/copy-files-to-another-repository/`](../../actions/copy-files-to-another-repository/)                                             | Composite action that copies the generated tree to a destination PR                                                               |

## Local configuration

The reusable workflow **requires the calling repository** to have a `.github/copy-files-config.yml`. The workflow checks out the calling repository's configuration; it does not share this repository's config with other callers. Example:

```yaml
source:
  repository: moyarich/reusable-workflows-callers
  directory: .github/workflows
  include:
    - "ci_*.yml"
    - "publish*.yml"
    - "release*.yml"
  exclude:
    - "reusable_*.yml"
destination-directory: .github/workflows
repositories:
  - name: moyarich/workspace-tools
    branch: main
    exclude:
      - publish-vscode-vsx.yml
```

The central configuration currently keeps other repositories, including `github_emulator`, on its explicit allowlist. Do not remove them simply because a smaller subset is documented elsewhere. Each repository can use `include`, `exclude`, and `overrides`; override keys must already exist in the canonical source file. `exclude` wins over `include`. Selected workflow files are copied whether they already exist or not. Deletions are not propagated.

## Running a sync

1. Open [Copy canonical workflow callers](https://github.com/moyarich/reusable-workflows/actions/workflows/copy.yml) and choose **Run workflow**.
2. Leave `dry-run` enabled to preview the files and differences. Set `repository` to one allowlisted `owner/repo` to limit the operation.
3. After reviewing the preview, rerun with `dry-run: false` to create/update a **destination pull request**. Review CI and the resulting workflow behavior before merging.

The reusable workflow takes `repository` (optional destination filter), `dry-run` (Boolean; default `true`), and the required `workflow-token` secret. The central caller maps `secrets._WORKFLOW_TOKEN` to `workflow-token`. The token must read source and destination repositories and have permission to write workflow files and PR branches in destinations. Neither a caller merge nor creation of a repo from the template automatically dispatches a copy run.

## Publishing, package choices, and safety

The generator reads the **canonical** workflow, applies destination-specific overrides, and never merges arbitrary destination YAML. It checks whether an existing `publish.yml` uses a compatible publisher (monorepo npm, single npm package, VS Code, browser extension, or custom). Unmatched types are rejected rather than overwritten. Where the canonical release/publish caller has a placeholder choice such as `packages/example`, it is only selected alongside the canonical `sync-release-package-choices.yml`. The synchronizer updates package options for the destination; it is not the copier's job to hardcode package names.

PR mode preserves existing synchronization review-branch commits and uses non-force pushes; diverged branches require manual reconciliation. No-op content does not create new commits. A dry run does not push. The configuration file itself is not copied to destinations.

## Troubleshooting

- **Missing caller configuration**: create `.github/copy-files-config.yml` in the invoking repository; the upstream repository's configuration is not a fallback for external callers.
- **Destination not allowlisted**: add the exact `owner/repo` to that caller's configuration and select its default branch.
- **Publishing incompatibility**: keep a repository-specific exclusion until a compatible canonical publishing caller is available.
- **No source files generated**: verify source filename globs, destination selection, exclusions, and package-choice synchronizer selection.
- **Authentication failure**: verify `_WORKFLOW_TOKEN` rights to destination workflows/contents and source checkout.
- **Conflicting PR branch**: reconcile review-branch edits instead of force-overwriting them.
