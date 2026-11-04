import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  fileURLToPath(
    new URL(
      "../../../../.github/workflows/reusable_npm-publish.yml",
      import.meta.url,
    ),
  ),
  "utf8",
);
const bulk = readFileSync(
  fileURLToPath(
    new URL(
      "../../../../.github/workflows/reusable_bulk-npm-publish.yml",
      import.meta.url,
    ),
  ),
  "utf8",
);
const step =
  workflow
    .split("      - name: Publish one configured registry\n")[1]
    ?.split("      - name: Record registry result\n")[0] ?? "";

describe("npm registry publishing is safe to retry", () => {
  it("warns and skips versions that already exist without attempting to publish them again", () => {
    expect(step).toContain('local_shasum="$(shasum -a 1');
    expect(step).toContain('npm view "$pkg_name@$pkg_version" dist.shasum');
    expect(step).toContain('"$published_shasum" != "$local_shasum"');
    expect(step).toContain("existing artifact left unchanged");
    expect(step).toContain("::warning title=Already published:");
    expect(step).toContain('echo "status=skipped" >> "$GITHUB_OUTPUT"');
    expect(step).toContain("skipping registry publication");
    expect(
      step.indexOf('npm view "$pkg_name@$pkg_version" dist.shasum'),
    ).toBeLessThan(step.indexOf('args=(publish "${files[0]}"'));
  });

  it("treats skipped existing versions as completed without hiding genuine registry failures", () => {
    expect(workflow).toContain('.status=="skipped"');
    expect(workflow).toContain('.status=="failed"');
    expect(workflow).toContain('.status=="blocked"');
    expect(workflow).toContain("elif all(.[]; .status==\"skipped\") then \"skipped\"");
  });

  it("uses OIDC for npm trusted publishing and propagates id-token permission through every nested stage", () => {
    expect(workflow).toContain("id-token: write");
    expect(workflow).toContain("package-manager-cache: false");
    expect(step).toContain("ACTIONS_ID_TOKEN_REQUEST_URL");
    expect(step).toContain("npm trusted publishing requires npm >= 11.5.1");
    expect((bulk.match(/id-token: write/g) ?? []).length).toBe(8);
  });

  it("keeps dry runs mutation-free while validating registry versions", () => {
    expect(step).toContain('if [ "$DRY_RUN" = "true" ]; then');
    expect(step).toContain("status=preview");
    expect(step).toContain('npm "${args[@]}" || {');
    expect(step).toContain("Registry $REGISTRY_ALIAS rejected publishing");
  });
});
