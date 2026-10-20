# Changelog

User-facing changes to the reusable workflows and standalone GitHub Actions are documented here. This changelog covers the reusable workflows and standalone GitHub Actions published by this repository.

## Unreleased

### Workspace package selection

- **Discoverable release and publish choices** — Automatically synchronize publishable workspace package options for manual Release Draft, Release, and Publish workflows, including adding new packages and removing options no longer publishable. Keep `all` available and leave unchanged selectors untouched.
- **Authorized workflow updates** — Support a caller-mapped `workflow-token` secret for safely updating GitHub Actions workflow files, independent of the caller's secret naming convention.
- **Synchronization visibility** — Display discovered packages, targeted workflow files, update status, and resulting commit in the GitHub Actions job summary. Support both manual synchronization and repository-triggered updates.

## [0.2.3]

### Publishing and registries

- **Unified npm publishing** — Use the registry matrix as the single publishing path, including dry-run checks and accurate reporting for versions already published.
- **Config-driven registry credentials** — Resolve npm and VS Code registry authentication through configured `token-source` values, including GitHub-provided tokens and caller secrets.
- **VS Code extension publishing** — Configure Marketplace and Open VSX destinations through registry files, consolidate extension publishing, and attach VSIX artifacts to draft releases.
- **Reliable package publishing** — Build workspace dependencies before packaging, read package changelogs correctly, and improve publication checks when optional credentials are unavailable.

### Releases and CI

- **Consolidated workspace releases** — Reuse shared release orchestration and restore detailed multi-package release summaries.
- **Improved release previews** — Report immutable Git tag conflicts and handle unavailable release-note label permissions without failing release drafting.
- **Safer automated repairs** — Retry npm lockfile and Prettier self-healing after concurrent branch updates.
- **Current GitHub Actions support** — Update official Actions and Node.js compatibility; validate release orchestration with actionlint.

## [0.2.2]

### Multi-package publishing

- **Dependency-driven publishing** — Discover publishable workspaces and publish them in dependency order, running independent packages concurrently. Remove the assumption that repositories use a fixed core, application, and addon hierarchy.
- **Configurable registries** — Define destinations in the shared `config/registries.yml` template and override them through a caller's `.github/registries.yml`. Support custom HTTPS registry URLs with explicitly passed authentication secrets.
- **Publish safeguards** — Validate package selection and dependency cycles, preserve canonical release and Git tag checks, and report publishing-stage coverage. Publishing to `all` continues to target npm and GitHub Packages.

### Release recovery

- **Shared bulk Reset and Restore** — Reuse package discovery, selection, and matrix orchestration for multi-package recovery without duplicating repository-specific workflow code.
- **Auditable recovery** — Record release states before and after recovery attempts, use GitHub API-backed preflight checks, and preserve protection for finalized or immutable releases.
- **Safer Restore previews** — Permit dry-run audits of finalized releases, with an explicit option to skip finalized releases during bulk recovery.
- **Reliable release creation** — Use GitHub's create response when resolving a newly created release to avoid eventual-consistency races.

## [0.2.1]

### Repository workflows

- Separate repository GitHub Releases from consumer npm publishing; this private repository does not publish an npm package.
- Authenticate GitHub Packages dependency installs in the reusable Pages workflow.
- Let reusable Node CI check out a supplied candidate ref for recovery verification.
- Add event-driven, guarded CI recovery: inspect trusted failed default-branch runs, propose supported dependency repairs, validate candidates using reusable Node CI, and open reviewable pull requests only after validation. No automatic merge.

## [0.2.0]

### Breaking changes

- **Typed Workspace Tools source selection** — Use a single `workspace-tools-source` input such as `registry:npm:0.2.0`, `checkout:current`, or `checkout:upstream;branch:main`. Previous separate source/ref inputs and legacy aliases are no longer supported.
- **Named CLI selectors** — Callers using Workspace Tools commands must use the new named package and directory options available in `@moyarich/workspace-tools@0.2.0`.

### Release and publishing

- **Choose release versions** — Draft and release packages with patch, minor, major, prerelease, exact, or package-manifest version selection.
- **Publish to npm or GitHub Packages** — Select `npm`, `github`, or `all` and optionally override the suggested npm distribution tag. Publishing verifies the canonical release identity and uses the tagged package source.
- **Reuse existing release drafts** — Finalize an existing exact-tag draft or create a missing one, including when publishing and releasing are separate operations.
- **Review publish and release previews** — Dry-run summaries show selected parameters, release identity, package version, distribution tag, and readiness without publishing.

### Workflows and actions

- **Preview protected resets** — Published versions produce an informative blocked Reset dry-run instead of a failed preview; real resets remain prohibited.
- **Restore tagged releases** — Preview recovery from a historical commit, tag, workflow run, artifact, or supported GitHub URL using Workspace Tools 0.2.0.
- **Avoid duplicate parameter summaries** — Reusable npm release and publish callers can opt into additional parameter summaries instead of receiving duplicates by default.

- **Test workflows directly** — Manually dispatch reusable release, publish, draft, and input-summary workflows to preview their behavior.
- **Run configurable browser tests** — Enable browser-based checks through reusable Node.js CI inputs.
- **Use current or upstream Workspace Tools source** — Test unreleased workspace tooling against a checked-out repository while keeping consumer source isolated.

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
