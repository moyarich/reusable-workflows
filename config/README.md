# Package registry configuration

`config/package-registries.yml` provides built-in publishing destinations. A calling repository may **extend or override** these entries with its own `registries-file` path, relative to the checkout. The workflow uses the bundled defaults if the caller's file is absent.

The map key is the registry selector. No separate `alias` field is needed.

```yaml
registries:
  company:
    url: https://npm.example.com
    backend: custom
    token-source: COMPANY_TOKEN
    publish-mode: direct
    enabled: true
    publish-github-release: false
    query:
      type: npm
```

Specify `registry: company` for one target or `registry: all` for every enabled entry, including the built-in destinations. Set `enabled: false` in a caller override to exclude a default destination.

`backend` names the publication adapter expected by the configured version of workspace-tools. `query` describes how package publication should be checked. `token-source` is the exact secret identifier used by the matrix publishing job through `secrets[matrix.target.tokenSource]`. With `secrets: inherit`, a caller's repository secret such as `_NPM_TOKEN` can be used directly as `token-source: _NPM_TOKEN`. When forwarding an explicit secret (for example `npm-token: ${{ secrets._NPM_TOKEN }}`), use `token-source: npm-token` instead. `token-source: github-token` selects the built-in `github.token`. The current single-job legacy publisher retains its original built-in credential handling. Never place tokens in this file.

`config/vscode-registries.yml` is the extension publication configuration introduced by PR #104, independent of package registries. GitHub Releases and GitHub Pages are not npm package registries.

Callers continue supplying standard workflow secrets (`npm-token` and, where needed, `custom-registry-token`). GitHub Packages uses the workflow's `github.token`. The `token-source` registry setting selects among these supported credential sources; no JSON secret is required. Optional alias-keyed overrides are supported for advanced custom destinations. Never commit token values to registry configuration.


Npm publishing now uses a **single per-registry matrix** by default. The caller registry YAML is merged with the built-in defaults by registry key; values in a caller's entry override matching properties without removing other built-in properties. Select `registry: all` to include every enabled entry. Each matrix job resolves `secrets[matrix.target.tokenSource]` directly, except `github-token`, which uses `github.token`. With `secrets: inherit`, `token-source: _NPM_TOKEN` selects the caller's `_NPM_TOKEN`; explicitly forwarded `npm-token` continues to select `token-source: npm-token`. No JSON token bundle or `matrix-publish` switch is required.

**Implementation note:** npm publishing checks now use the registry's `query.type: npm` adapter and report publication status for each selected registry. Other release workflows are not yet wired to the same check. The workspace-tools publish CLI still handles backend-specific behavior. Treat multi-target publication as unverified until CI and dry-run checks complete.
