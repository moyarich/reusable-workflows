# Distribution architecture

The monorepo contains two build workspaces and **one publishable npm CLI package**.

| Workspace          | Responsibility                        | Publication | Output               |
| ------------------ | ------------------------------------- | ----------- | -------------------- |
| `packages/cli`     | CLI and importable TypeScript modules | Public npm  | `packages/cli/dist/` |
| `packages/actions` | GitHub Action metadata and bundling   | Private     | Root `actions/`      |

`packages/actions` imports reusable modules directly from `packages/cli/src/<feature>/` at **build time**. Vite includes their runtime dependencies in the generated Action bundles, so users do not need to install `@moyarich/reusable-workflows-cli` to run an Action. The npm package does not declare any dependency on the private Actions workspace.

## Authored sources

- Reusable TypeScript and JavaScript live in `packages/cli/src/<feature>/`.
- The CLI entry point is `packages/cli/src/bin/cli-entries.ts`.
- Action manifests and other authored Action resources live in `packages/actions/actions/<action-name>/`.
- The private Actions build uses `packages/actions/vite.config.ts`.

## Generated distributions

- `packages/cli/dist/` is the npm package build output.
- Repository-root `actions/` is the **complete generated GitHub Actions distribution**, checked in for GitHub `uses:` references.
- `actions/<action-name>/action.yml` lives next to its compiled `index.mjs` or composite action runtime scripts.
- Shared Vite chunks and assets are emitted to `actions/_assets/`; individual Action entry points reference them through relative imports.
- Temporary staging under `actions/.bundles/` must be removed after generation.

## Build commands

```sh
npm run build:cli      # npm CLI package only
npm run build:actions  # private Actions package builds root actions/
npm run build:all      # both
npm run check:cli-dist
npm pack -w @moyarich/reusable-workflows-cli --dry-run
```

It must be safe to delete the entire root `actions/` folder and run `npm run build:actions` to reconstruct it deterministically. Neither Vite nor the generator may delete or overwrite authored files under `packages/cli/src/` or `packages/actions/actions/`. CI checks clean regeneration and verifies the authored source tree is unchanged.

`check-dist` uses separate distribution targets: `actions/` for GitHub Actions and `packages/cli/dist/` for the npm CLI. Only `packages/cli` is eligible for npm publication.

## Combined Commander CLI

The npm package exposes one executable, `reusable-workflows-cli`, built from
`packages/cli/src/bin/cli-entries.ts` into `dist/bin/cli.mjs`.
Each utility owns its own command factory; the combined CLI registers them.
GitHub Actions retain their dedicated action entry points and build independently.

```sh
npx @moyarich/reusable-workflows-cli --help
npx @moyarich/reusable-workflows-cli workspace-source --source registry:npm:latest
npx @moyarich/reusable-workflows-cli release-validate --help
npx @moyarich/reusable-workflows-cli browser --help
npx @moyarich/reusable-workflows-cli setup-workspace-tools --help
npx @moyarich/reusable-workflows-cli copy-workflow --help
npx @moyarich/reusable-workflows-cli copy-workflow-choices --help
npx @moyarich/reusable-workflows-cli sync-workflow-choices --help
npx @moyarich/reusable-workflows-cli sync-release-choices --help
npx @moyarich/reusable-workflows-cli sync-release-summary
```

The CLI workspace also builds a self-contained copy of the combined CLI at
`actions/cli/index.mjs` using `vite.workflow.config.ts`, with its schema alongside it.
The root `build:actions` command coordinates the action build first, then this CLI-owned build. Workflows run this committed
runtime directly; they do not install npm dependencies or build the CLI to use it.
The npm package continues to expose `dist/bin/cli.mjs` for `npx` users.
The npm executable is built and validated by `@moyarich/vite-plugin-package-bin`.
Action bundles use `@moyarich/vite-github-actions`. A small shared `runtime-assets`
Vite plugin copies the runtime schema; no post-build scripts are required.

## TypeScript application modules

The npm build also runs TypeScript with `tsconfig.modules.json`, producing
JavaScript modules and matching declarations in `dist/`. Package exports
expose the root API and module subpaths. This does not require `unplugin-dts` or a
Vite library configuration. The combined executable remains in `dist/bin/`.
