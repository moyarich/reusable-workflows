# @moyarich/reusable-workflows-cli

Reusable workflow utilities for Node.js and TypeScript applications, plus one combined CLI.
Requires Node.js 24 or newer.

## Command line

```sh
npx @moyarich/reusable-workflows-cli --help
npx @moyarich/reusable-workflows-cli copy-workflow --help
npx @moyarich/reusable-workflows-cli browser --help
```

Commands: `workspace-source`, `release-validate`, `browser`, `setup-workspace-tools`,
`copy-workflow`, `copy-workflow-choices`, `sync-workflow-choices`,
`sync-release-choices`, and `sync-release-summary`.

## TypeScript and JavaScript imports

```ts
import { parseWorkspaceToolsSource } from "@moyarich/reusable-workflows-cli";
import { resolveWorkspaces } from "@moyarich/reusable-workflows-cli/resolve-workspaces/index";
import { createCopyWorkflowCommand } from "@moyarich/reusable-workflows-cli/copy/copy-workflows-cli";

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
