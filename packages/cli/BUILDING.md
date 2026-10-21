# CLI and GitHub Action build standard

The npm CLI and the GitHub Action distribution are independent products, built from
shared source in `packages/cli/src/`. Never treat `actions/_assets/` as an npm
publication directory or the npm `dist/` folder as a GitHub Action runtime.

| Product                   | Sources                                                  | Build command (repository root)                 | Output                        | Consumer                     |
| ------------------------- | -------------------------------------------------------- | ----------------------------------------------- | ----------------------------- | ---------------------------- |
| npm executable            | `packages/cli/src/cli.ts`                                | `npm run build:package`                         | `packages/cli/dist/cli.mjs`   | npm `bin.reusable-workflows` |
| npm importable modules    | side-effect-free modules in `packages/cli/src/`          | `npm run build:package`                         | `packages/cli/dist/lib/*.mjs` | npm package `exports`        |
| JavaScript GitHub Actions | `packages/cli/src/*/index.ts`                            | `npm run build:actions`                         | `actions/_assets/*.mjs`          | `actions/*/action.yml`       |
| Composite Actions         | `actions/*/action.yml` or source-side composite metadata | no JavaScript bundling required for shell steps | repository source             | GitHub `uses:`               |

## Rules

1. Each bundled JavaScript action has a real TypeScript CLI or `index.ts` entry and its
   externally usable `actions/<name>/action.yml` points into
   `../dist/<name>.mjs`. Composite actions live in `actions/<name>/action.yml` and may invoke
   JavaScript sources under `packages/cli/src/` without generating a
   redundant `actions/_assets/<name>.mjs` bundle.
2. Shared logic belongs in importable, side-effect-free modules. A command
   entry can import this logic, but shared libraries must **not** import command
   entry points (which can parse arguments or write GitHub outputs).
3. Vite uses absolute directories derived from `import.meta.url`; builds must
   not depend on the runner's working directory.
4. `packages/cli/package.json` controls the published `bin`, `exports`,
   and `files` fields. Only `dist/` is in the npm tarball.
5. Never clear `actions/_assets/` when compiling the npm CLI, or clear
   `packages/cli/dist/` when rebuilding GitHub Actions.
6. CI must run `npm run build:actions`, `npm run build:package`,
   `npm run typecheck`, and `npm pack --workspace
@moyarich/reusable-workflows-cli --dry-run` before release.
7. Version the CLI and its public module exports together. Preserve existing
   GitHub Action paths and user-facing command names when refactoring.

## Commands

```sh
npm run build:actions
npm run build:package
node packages/cli/dist/cli.mjs --help
npm pack --workspace @moyarich/reusable-workflows-cli --dry-run
```

## Canonical Action source vs distribution

- Author GitHub Action metadata and documentation in `packages/cli/actions/<name>/`.
- Author implementation and shared library code in `packages/cli/src/` (or other `packages/cli/src/` modules).
- `npm run build:actions` bundles node24 Action runtime entry points into `actions/_assets/`, then runs `packages/cli/scripts/generate-actions.mjs` to regenerate the **entire** public `actions/<name>/` distribution, including composite script dependencies.
- Root `actions/` is **generated and checked in** so users can call `moyarich/reusable-workflows/actions/<name>@<ref>` without an npm install or source-tree layout assumptions. Never hand-edit root `actions/` metadata.
- The npm package only publishes `packages/cli/dist/`; `actions/` is intentionally not part of its npm tarball.
- The proposed Git source `@moyarich/vite-package-bin` is currently unimplemented on `main`; do not add it until it contains a usable manifest, compiled exports and passing integration tests.
