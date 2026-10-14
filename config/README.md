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
