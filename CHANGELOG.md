# Changelog

User-facing changes to the reusable workflows and standalone GitHub Actions are documented here. This changelog covers the reusable workflows and standalone GitHub Actions published by this repository.

## Unreleased

### Breaking changes

- Rename Workspace Tools source options to `registry`, `workspace`, and `repository`, replacing `package`, `local`, and `upstream`. Rename `workspace-tools-upstream-ref` to `workspace-tools-ref` and the setup action's `upstream-ref` to `ref`. Update action and workflow callers to use the new names.

### Improvements

- Select a published Workspace Tools version, build from the current workspace, or fetch and build from a chosen Git repository ref. Repository-source builds are isolated from the consuming checkout.
- Run additional reusable workflows manually from GitHub Actions, including GitHub Release, Release Drafter, action version publication, and dispatch input summaries.
- Configure browser-based Node.js CI tests through both manual and reusable workflow inputs.
- Improve workspace CI configuration and remove repository-specific browser-test assumptions.

## [0.1.0] - Initial Release

### CI and package quality

- Run reusable Node.js CI with configurable Node versions, install commands, build commands, test commands, and working directories.
- Discover repository packages and run package-scoped CI across generated package matrices.
- Rebuild committed distribution output, fail when generated files drift, and preserve rebuilt output for inspection when validation fails.
- Check Prettier formatting and optionally repair formatting through self-healing workflow runs.
- Validate root `package-lock.json` state and optionally repair lockfile drift through self-healing workflow runs.

### Package discovery and Workspace Tools

- Discover root packages, npm workspaces, and direct-child packages with filters for private packages, publish configuration, test scripts, and build scripts.
- Expose normalized package lists and GitHub Actions matrix outputs for downstream jobs.
- Resolve `@moyarich/workspace-tools` from the published GitHub Packages package for normal consumers.
- Support a caller-source mode for the `workspace-tools` repository so unreleased CLI changes can be exercised from the current checkout.

### Releases and release drafts

- Preview package releases without changing files, commits, tags, packages, or GitHub Releases.
- Resolve bump, exact-version, and existing-`package.json` release modes and expose the resolved package, version, canonical tag, release name, and readiness state.
- Verify candidate package versions against the package's configured registry, including GitHub Packages, before release.
- Prepare package versions and release state separately from publishing when callers need staged release workflows.
- Create release commits and canonical package tags while protecting existing tags from being moved.
- Create and update GitHub Release drafts while preserving maintainer-authored draft text and appending newly discovered release entries.
- Seed an initial release draft from changelog content when no prior release exists.
- Surface release-draft content, changelog sections, release identity, release state, and dry-run results in GitHub Actions summaries.
- Create or promote matching GitHub Releases from prepared release information.
- Promote published stable release tags to moving major compatibility aliases such as `v1.2.3` → `v1` through a reusable workflow.
- Delete release tags and matching GitHub Releases through reusable release cleanup automation.

### Package publishing

- Publish npm packages from prepared release state with dry-run support and release-readiness checks.
- Publish packages to their configured npm registry, including GitHub Packages.
- Publish Codemod Registry packages through a dedicated reusable workflow.
- Validate, package, and publish VS Code extensions to the VS Code Marketplace, then promote the matching GitHub draft release.

### GitHub Pages and documentation automation

- Build and deploy static sites to GitHub Pages with repository-relative base-path support.
- Generate and update README screenshots through reusable browser-based repository automation.
- Use repository-hosted examples and documentation as source content for playground and documentation sites.

### Issue dependencies

- Add and remove native GitHub issue dependency relationships through a reusable workflow.
- Render issue dependency trees as Markdown for workflow summaries and other GitHub surfaces.
- Expose normalized dependency graph data for callers that need to consume the dependency structure programmatically.

### Standalone actions

- `discover-packages` — discover repository packages directly inside an existing job and expose normalized package and matrix outputs.
- `setup-workspace-tools` — install a published Workspace Tools version or resolve the current caller checkout and expose its CLI directory.
- `release-draft-sync` — reconcile persistent GitHub Release draft content without overwriting maintainer-authored text.
- `issue-dependency-tree` — render native GitHub issue dependency trees as Markdown and normalized graph data.
