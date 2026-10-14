# Publishing registry configuration

The reusable npm publisher reads `config/registries.yml` from **reusable-workflows**. A caller repository can override entries in `.github/registries.yml`:

```yaml
registries:
  custom:
    url: https://registry.example.com/npm/
    token-secret: CUSTOM_REGISTRY_TOKEN
    publish-mode: direct
    enabled: true
```

Select `registry: custom` (or another configured custom entry name) when calling `reusable_npm-publish.yml`. Pass `custom-registry-token` explicitly from the caller's GitHub Actions secret; the `token-secret` value documents the required secret and does **not** dynamically read it. No tokens belong in YAML.

The built-in `npm` and `github` destinations retain their current URLs, authentication, and publishing semantics; their URLs cannot be overridden. For backward compatibility, `registry: all` means npmjs.org plus GitHub Packages, **not** all custom destinations. The caller can optionally provide `registry-url` to override its configured custom endpoint.

URLs must use HTTPS and may not contain credentials, a query string, or a fragment. A custom registry publishes directly; npmjs.org continues to use staged publishing. The `workspace-tools` version configured in the reusable workflow must support `--registry custom --registry-url`.

Console's existing dispatch inputs are unchanged, so its UI continues to offer `npm`, `github`, and `all`. Direct reusable-workflow callers can opt into custom destinations.


## Registry configuration

- `package-registries.yml` replaces `registries.yml` as the fallback for npm package publishing.
- `vscodew-registries.yml` lists extension publishing destinations for VS Code workflow integration.

The registry mapping key is the selector: `company:` is selected using `registry: company` without a redundant `alias` field. The `registries-file` input selects a file from the caller's checkout; absent files fall back to the version-matched package defaults. `all` selects every enabled configured entry.
