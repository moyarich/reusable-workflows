# GitHub Action source and generated distribution

The repository root `actions/` is **generated and replaceable**. Do not edit or store authoritative implementations there.

| Purpose                                       | Authoritative path                                           |
| --------------------------------------------- | ------------------------------------------------------------ |
| Action metadata (`action.yml`, action README) | `packages/actions/actions/<name>/`                           |
| CLI and composite action runtime code         | `packages/cli/src/`                                          |
| Vite entrypoint configuration                 | `packages/actions/vite.config.ts`                            |
| Bundling and distribution generator           | `@moyarich/vite-github-actions`                              |
| Check-dist JSON schema                        | `packages/cli/src/schemas/check-dist-config.schema.json`     |
| Check-dist example YAML                       | `.github/reusable-configurations/check-dist-config.yml`      |
| Per-caller check-dist override                | `.github/check-dist-config.yml` in the **caller repository** |
| Publishable action bundles and metadata       | `actions/` (generated)                                       |

## Regeneration

```sh
npm run build:actions
npm run check:cli-dist
```

The `@moyarich/vite-github-actions` plugin generates the action distribution after bundling. The plugin stages temporary bundles in `.vite-github-actions-build`, then copies compiled entries, action metadata, and explicitly mapped JSON schemas into root `actions/`. It preserves the existing action metadata paths, and may emit shared chunks under `actions/_chunks/`. The generated directory should be treated as build output; clean stale files before regeneration when required.

A useful destructive recovery test in a **clean disposable checkout or worktree** is:

```sh
rm -rf actions
npm run build:actions
npm run check:cli-dist
```

Do not delete root `actions/` in an active checkout without first ensuring no local edits are needed. GitHub workflows that use `./actions/<name>` need the generated files present in the checked-out revision or rebuilt before invocation; regeneration does not make a missing action automatically usable before checkout/setup.

When adding an action, add metadata under `packages/actions/actions/<name>/`, the runtime implementation under `packages/cli/src/` when needed, and follow the standard `packages/cli/src/<feature>/action-entry.ts` convention. The Vite glob discovers these entries automatically; add special static assets to `copy` mappings only when necessary. Generated output should never contain code that exists only in root `actions/`.

The root `npm run build:actions` command then asks `packages/cli` to build its
self-contained workflow runtime into `actions/cli/`. The Actions workspace does
not build the combined CLI. The CLI npm build separately writes `dist/bin/cli.mjs`
and includes `dist/` in its npm package.

Compiled actions use `packages/cli/src/<feature>/action-entry.ts` as their Vite
entry point. Reusable modules do not execute action code when imported. The
build emits `actions/<feature>/index.mjs`; action metadata and workflows execute
these built files. Composite actions containing only inline scripts need no
TypeScript entry point.
