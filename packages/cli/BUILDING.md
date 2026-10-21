# Distribution architecture

The monorepo contains two build workspaces and **one publishable npm package**.

| Workspace          | Responsibility                               | Publication | Output               |
| ------------------ | -------------------------------------------- | ----------- | -------------------- |
| `packages/cli`     | CLI, reusable modules and public npm exports | Public npm  | `packages/cli/dist/` |
| `packages/actions` | GitHub Action metadata and bundling          | Private     | Root `actions/`      |

`packages/actions` imports reusable modules directly from `packages/cli/src/<feature>/` at **build time**. Vite includes their runtime dependencies in the generated Action bundles, so users do not need to install `@moyarich/reusable-workflows-cli` to run an Action. The npm package does not declare any dependency on the private Actions workspace.

## Authored sources

- Reusable TypeScript and JavaScript live in `packages/cli/src/<feature>/`.
- The CLI entry point is `packages/cli/src/cli.ts`; public imports use the `exports` in `packages/cli/package.json`.
- Action manifests and other authored Action resources live in `packages/actions/actions/<action-name>/`.
- The private Actions build uses `packages/actions/vite.config.ts` and `packages/actions/scripts/`.

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
