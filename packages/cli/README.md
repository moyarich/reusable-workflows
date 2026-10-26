# @moyarich/reusable-workflows-cli

Reusable workflow utilities for Node.js and TypeScript applications, plus one combined CLI.
Requires Node.js 24 or newer.

## Command line

```sh
npx @moyarich/reusable-workflows-cli --help
npx @moyarich/reusable-workflows-cli copy-workflow --help
npx @moyarich/reusable-workflows-cli browser --help
npx @moyarich/reusable-workflows-cli validate-schema --schema schema.json --file config.yml
```

Commands: `validate-schema`, `workspace-source`, `release-validate`, `browser`, `setup-workspace-tools`,
`copy-workflow`, `copy-workflow-choices`, `sync-workflow-choices`,
`sync-release-choices`, and `sync-release-summary`.

`validate-schema` accepts JSON or YAML documents and a local JSON schema file.
It writes JSON to stdout: `{ "valid": true, "errors": [], "file": "config.yml", "schema": "schema.json" }`.
Failures include `"valid": false`, an `error` message, and an `errors` array containing
Ajv details (`instancePath`, `schemaPath`, `keyword`, `params`, and `message`).
File and parsing failures return an empty `errors` array. Failures exit with code 1.

## TypeScript and JavaScript imports

```ts
import { parseWorkspaceToolsSource } from "@moyarich/reusable-workflows-cli";
import { resolveWorkspaces } from "@moyarich/reusable-workflows-cli/resolve-workspaces/index";
import { createCopyWorkflowCommand } from "@moyarich/reusable-workflows-cli/copy-workflows/copy-workflows-cli";

const source = parseWorkspaceToolsSource("registry:npm:latest");
```

Reusable modules retain their source directory structure under `dist/`,
with JavaScript and matching `.d.ts` declarations. Import module subpaths without
an extension or with `.js`. Executable-only action and CLI entry files are excluded
from the module build. Importing a command factory does not parse arguments.

Reusable modules are emitted as ES modules. The package marks them as safe for
tree shaking, so bundlers can remove unused imports. The combined executable is
excluded from that declaration.

The npm package includes `dist/bin/cli.mjs`, reusable modules, configuration
schemas, this README, the MIT license, and the changelog.

GitHub Actions use a separate runtime distribution in the repository's `actions/`
directory. See [the repository](https://github.com/moyarich/reusable-workflows).

`validateSchema(schema, data)` returns a JSON-serializable result with `valid` and
`errors`. Failures also include an `error` message. The function does not throw
for invalid data or schema compilation failures.
