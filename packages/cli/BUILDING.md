# CLI and GitHub Action build standard

The npm CLI and the GitHub Action distribution are independent products, built from
shared source in `packages/cli/src/`. Never treat `actions/dist/` as an npm
publication directory or the npm `dist/` folder as a GitHub Action runtime.

| Product | Sources | Build command (repository root) | Output | Consumer |
| --- | --- | --- | --- | --- |
| npm executable | `packages/cli/src/cli.ts` | `npm run build:package` | `packages/cli/dist/cli.mjs` | npm `bin.reusable-workflows` |
| npm importable modules | side-effect-free modules in `packages/cli/src/actions/` | `npm run build:package` | `packages/cli/dist/lib/*.mjs` | npm package `exports` |
| JavaScript GitHub Actions | `packages/cli/src/actions/*/index.ts` | `npm run build:actions` | `actions/dist/*.mjs` | `actions/*/action.yml` |
| Composite Actions | `actions/*/action.yml` or source-side composite metadata | no JavaScript bundling required for shell steps | repository source | GitHub `uses:` |

## Rules

1. Each bundled JavaScript action has a real `index.ts` entry and its
   externally usable `actions/<name>/action.yml` points into
   `../dist/<name>.mjs`. An action requiring a separate `*.mjs` script can
   remain composite; do not create a fake runtime entry solely to satisfy Vite.
2. Shared logic belongs in importable, side-effect-free modules. A command
   entry can import this logic, but shared libraries must **not** import command
   entry points (which can parse arguments or write GitHub outputs).
3. Vite uses absolute directories derived from `import.meta.url`; builds must
   not depend on the runner's working directory.
4. `packages/cli/package.json` controls the published `bin`, `exports`,
   and `files` fields. Only `dist/` is in the npm tarball.
5. Never clear `actions/dist/` when compiling the npm CLI, or clear
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
