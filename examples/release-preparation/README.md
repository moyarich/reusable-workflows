# Release preparation PR metadata

The release preparation workflow creates an editable `release/prepare-*` branch and embeds package selection in the **pull request description**, between the following markers:

<!-- release-preparation:start -->

```json
{
  "schemaVersion": 1,
  "packages": [
    { "name": "@example/core", "directory": "packages/core" },
    { "name": "@example/cli", "directory": "packages/cli" }
  ]
}
```

<!-- release-preparation:end -->

The description is the source of truth for **which packages** belong to the release. It may be edited before merging the PR. Code, tests, changelogs, dependencies and package versions on the PR branch remain editable as well.

On merge, `reusable_verify-release-preparation.yml` reads package selection from the merged PR description and takes **final versions** from each selected package's `package.json` in the **merge commit**.

The initiating preparation workflow also uploads `prepared-release-manifest` as an Actions artifact for diagnostics. The artifact is not used to determine final release versions or package selection after merge.

No temporary `.github/release-preparation.json` file is committed to the release branch or carried into the default branch. Merging the PR can create a GitHub release and tag, but never publishes npm packages.
