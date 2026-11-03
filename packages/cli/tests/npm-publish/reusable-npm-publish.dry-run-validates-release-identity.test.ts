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

const step = (name: string, nextName: string) =>
  workflow
    .split(`      - name: ${name}\n`)[1]
    ?.split(`      - name: ${nextName}\n`)[0] ?? "";

describe("npm publish dry-run release identity validation", () => {
  it("fails when the canonical GitHub Release is missing or mismatched in every mode", () => {
    const validation = step(
      "Verify matching GitHub Release",
      "Validate release identity marker",
    );
    expect(validation).toContain('if [ "$VALID" != "true" ]; then');
    expect(validation).toContain('echo "::error::$REASON"');
    expect(validation).toContain("exit 1");
    expect(validation).not.toContain('&& [ "$DRY_RUN" != "true" ]');
    expect(validation).not.toContain("DRY_RUN: ${{ inputs.dry-run }}");
  });

  it("validates the release marker against the resolved package name", () => {
    const marker = step(
      "Validate release identity marker",
      "Prepare package artifact directory",
    );
    expect(marker).toContain("package-name: ${{ steps.plan.outputs.name }}");
    expect(marker).toContain('required: "true"');
  });

  it("rejects missing requested release tags even in dry-run mode", () => {
    const plan = step("Resolve publish plan", "Validate requested version");
    expect(plan).toContain('if [ -z "$RELEASE_COMMIT" ]; then');
    expect(plan).toContain(
      'echo "::error::Requested release tag does not exist: $REQUESTED_RELEASE_TAG"',
    );
    expect(plan).not.toContain("using checked-out source for the dry-run plan");
  });

  it("only packs from the canonical release tag and never substitutes the current commit", () => {
    const artifact = step(
      "Resolve canonical package artifact",
      "Validate packaged CLI entry points",
    );
    expect(artifact).toContain('if [ -z "$RELEASE_COMMIT" ]; then');
    expect(artifact).toContain("exit 1");
    expect(artifact).not.toContain('RELEASE_COMMIT="$GITHUB_SHA"');
    expect(artifact).not.toContain("checkout-preview");
  });
});
