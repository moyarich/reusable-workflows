# Package registry configuration

`config/package-registries.yml` provides built-in publishing destinations. A calling repository may **extend or override** these entries with its own `registries-file` path, relative to the checkout. The workflow uses the bundled defaults if the caller's file is absent.

The map key is the registry selector. No separate `alias` field is needed.

```yaml
registries:
  company:
    url: https://npm.example.com
    backend: custom
    token-secret: COMPANY_TOKEN
    publish-mode: direct
    enabled: true
    publish-github-release: false
    query:
      type: npm
```

Specify `registry: company` for one target or `registry: all` for every enabled entry, including the built-in destinations. Set `enabled: false` in a caller override to exclude a default destination.

`backend` names the publication adapter expected by the configured version of workspace-tools. `query` describes how package publication should be checked. `token-secret` documents the intended credential, but GitHub Actions cannot dynamically evaluate `secrets[<name>]` from YAML at runtime; credentials must be forwarded through workflow secrets. Never place tokens in this file.

`config/vscodew-registries.yml` is reserved for extension publication destinations, independent of package registries. GitHub Releases and GitHub Pages are not npm package registries.

For multiple private registries, callers may pass the `registry-tokens-json` workflow secret containing a JSON object keyed by registry name (for example, `{"company":"...","internal":"..."}`). This is a secret value, **not** a YAML field committed to the repository. Existing `custom-registry-token` remains a compatibility fallback. The `token-source` field identifies the available credentials for query checks; the registry file's `token-secret` value is informational; GitHub Actions requires secrets to be mapped explicitly.

**Implementation note:** npm publishing checks now use the registry's `query.type: npm` adapter and report publication status for each selected registry. Other release workflows are not yet wired to the same check. The workspace-tools publish CLI still handles backend-specific behavior. Treat multi-target publication as unverified until CI and dry-run checks complete.
