# Release Drafter manual dispatch

The Release Drafter workflow supports reusable calls and manual runs. Manual runs default to a dry-run preview, so you can inspect the resolved draft before enabling writes.

## Version selection

The proposed compact dispatch syntax groups related version settings into one `version` field. The manual workflow now accepts typed version selection through `version-selection`. Reusable callers still have separate version parameters while the `workflow_call` migration is completed.

| Proposed `version` value | Meaning | Example with latest release `v1.2.3` |
| --- | --- | --- |
| `auto` (default) | Let Release Drafter resolve the next version using its configured PR labels and versioning rules | `1.3.0` if a minor change is detected |
| `bump:patch` | Request a patch increment | `1.2.4` |
| `bump:minor` | Request a minor increment | `1.3.0` |
| `bump:major` | Request a major increment | `2.0.0` |
| `exact:1.5.0` | Use the specified semantic version | `1.5.0` |
| `package-json` | Read the selected package's version from its `package.json` | Depends on the package |

The examples assume an ordinary stable release history; actual automatic results depend on the Release Drafter configuration, available PR labels, and the selected target. When no relevant release exists, `initial-version` (currently `0.1.0`) supplies the starting version.

## Proposed compact dispatch input table

GitHub limits `workflow_dispatch` to 10 top-level inputs. The manual workflow now has seven inputs. The exact field names are shown below.

| Input | Default | Accepted values / purpose |
| --- | --- | --- |
| `target` | `repository` | `repository`, `package:<name>`, `directory:<path>` |
| `target-branch` | `main` | Branch containing merged pull requests |
| `version-selection` | `auto` | `auto`, `bump:<increment>`, `exact:<semver>`, `package-json` |
| `release` | `auto` | `auto`, `tag:<tag>`, `name:<name>` |
| `changelog-path` | `CHANGELOG.md` | Changelog path for seeding a missing draft |
| `template-path` | `.github/release-drafter-template.yml` | Release Drafter configuration path |
| `dry-run` | `true` | Preview without writing (`true`) or allow draft updates (`false`) |

The shared typed-value parser should split at the **first colon only** and validate the type and value. Independently meaningful settings, such as `dry-run`, remain separate.

## Compatibility and current status

The typed-value parser is implemented for manual Release Drafter and npm release runs. The reusable `workflow_call` API still uses its existing input groups; migration to typed inputs for callers is outstanding.
