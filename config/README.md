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

`backend` names the publication adapter expected by the configured version of workspace-tools. `query` describes how package publication should be checked. `token-source` is the logical credential identifier resolved from `registry-tokens-json`. GitHub Actions cannot dynamically evaluate `secrets[<name>]` from YAML at runtime. Never place tokens in this file.

`config/vscode-registries.yml` is the extension publication configuration introduced by PR #104, independent of package registries. GitHub Releases and GitHub Pages are not npm package registries.

Callers continue supplying standard workflow secrets (`npm-token` and, where needed, `custom-registry-token`). GitHub Packages uses the workflow's `github.token`. The `token-source` registry setting selects among these supported credential sources; no JSON secret is required. Optional alias-keyed overrides are supported for advanced custom destinations. Never commit token values to registry configuration.

**Implementation note:** npm publishing checks now use the registry's `query.type: npm` adapter and report publication status for each selected registry. Other release workflows are not yet wired to the same check. The workspace-tools publish CLI still handles backend-specific behavior. Treat multi-target publication as unverified until CI and dry-run checks complete.
