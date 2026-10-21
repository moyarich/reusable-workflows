# GitHub Action source and generated distribution

The repository root `actions/` is **generated and replaceable**. Do not edit or store authoritative implementations there.

| Purpose | Authoritative path |
| --- | --- |
| Action metadata (`action.yml`, action README) | `packages/actions/actions/<name>/` |
| CLI and composite action runtime code | `packages/cli/src/` |
| Vite entrypoint configuration | `packages/actions/vite.config.ts` |
| Bundling and distribution generator | `packages/actions/scripts/` |
| Check-dist JSON schema | `reusable-configurations/check-dist-config.schema.json` |
| Check-dist example YAML | `reusable-configurations/check-dist-config.yml` |
| Per-caller check-dist override | `.github/check-dist-config.yml` in the **caller repository** |
| Publishable action bundles and metadata | `actions/` (generated) |

The schema under `actions/check-dist/config.schema.json` is a **copied runtime file**, not an independent schema. Its canonical source is `reusable-configurations/check-dist-config.schema.json`; keep the copy because the published composite action validates caller YAML using `$GITHUB_ACTION_PATH/config.schema.json`.

## Regeneration

```sh
npm run build:actions
npm run check:cli-dist
```

The build stages temporary JS bundles under `packages/actions/dist/.bundles` (not under root `actions/`), recreates the root distribution directory if absent, copies source action metadata and composite runtimes, and checks the output against authored sources. Vite-generated shared assets are copied to `actions/_assets/`.

A useful destructive recovery test in a **clean disposable checkout or worktree** is:

```sh
rm -rf actions
npm run build:actions
npm run check:cli-dist
```

Do not delete root `actions/` in an active checkout without first ensuring no local edits are needed. GitHub workflows that use `./actions/<name>` need the generated files present in the checked-out revision or rebuilt before invocation; regeneration does not make a missing action automatically usable before checkout/setup.

When adding an action, add metadata under `packages/actions/actions/<name>/`, the runtime implementation under `packages/cli/src/` when needed, and register its bundling or copied runtime mapping in `packages/actions/vite.config.ts` / `packages/actions/scripts/generate-actions.mjs`. Generated output should never contain code that exists only in root `actions/`.
