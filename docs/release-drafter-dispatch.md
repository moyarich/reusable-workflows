# Release Drafter manual dispatch

The Release Drafter workflow supports reusable calls and manual runs. Manual runs default to a dry-run preview, so you can inspect the resolved draft before enabling writes.

## Version selection

The proposed compact dispatch syntax groups related version settings into one `version` field. The manual workflow now accepts typed version selection through `version-selection`. Reusable callers still have separate version parameters while the `workflow_call` migration is completed.

| Proposed `version` value | Meaning | Example with latest release `v1.2.3` |
| --- | --- | --- |
| `auto` (default) | Compute the next patch version from the latest **published GitHub Release** (ignore drafts and `package.json`) | `1.2.4` |
| `bump:patch` | Request a patch increment | `1.2.4` |
| `bump:minor` | Request a minor increment | `1.3.0` |
| `bump:major` | Request a major increment | `2.0.0` |
| `exact:1.5.0` | Use the specified semantic version | `1.5.0` |
| `package-json` | Read the selected package's version from its `package.json` | Depends on the package |

For `auto`, the latest published GitHub Release tag is the version baseline. Drafts and `package.json` do not advance it; an existing exact-tag draft is reused. A patch increment is the default, including automatic push-triggered drafts. For a different increment, explicitly choose `bump:<increment>`. When no published release exists, `initial-version` (currently `0.1.0`) supplies the starting version. The `package-json` selection reads the manifest without bumping it. Explicit `bump` uses the manifest as its baseline.

## Proposed compact dispatch input table

GitHub limits `workflow_dispatch` to 10 top-level inputs. The manual workflow has seven inputs. The exact field names are shown below.

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
