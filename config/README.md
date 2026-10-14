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

Callers pass a single `registry-tokens-json` workflow secret containing a JSON object whose keys are registry aliases or `token-source` identifiers (for example, `{"npm-token":"...","github-token":"...","company":"..."}`). Alias keys take precedence over source keys. Store the JSON **as a GitHub Actions secret**, not in the repository. The old individual npm/custom credential inputs and implicit GitHub token publishing fallback are intentionally removed. The publisher uses the resolved token for both publication queries and publishing. Missing credentials fail when attempting a live publish; dry runs remain available.

**Implementation note:** npm publishing checks now use the registry's `query.type: npm` adapter and report publication status for each selected registry. Other release workflows are not yet wired to the same check. The workspace-tools publish CLI still handles backend-specific behavior. Treat multi-target publication as unverified until CI and dry-run checks complete.
