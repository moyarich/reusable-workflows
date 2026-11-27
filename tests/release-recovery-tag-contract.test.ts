import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("release recovery tag contract", () => {
  for (const operation of ["reset", "restore"]) {
    it(`${operation} uses manifest names for root and workspace packages`, () => {
      const source = readFileSync(
        new URL(
          `../.github/workflows/reusable_release-${operation}.yml`,
          import.meta.url,
        ),
        "utf8",
      );
      expect(source).toContain('TAG="$PACKAGE_NAME@$VERSION"');
      expect(source).toContain('TAG_PREFIX="$PACKAGE_NAME@"');
      expect(source).not.toContain('TAG="$DIRECTORY@$VERSION"');
      expect(source).not.toContain('TAG_PREFIX="$PACKAGE_DIRECTORY@"');
      expect(source).toContain('TAG="$CUSTOM_TAG_PREFIX$VERSION"');
      expect(source).toContain('TAG_PREFIX="$CUSTOM_TAG_PREFIX"');
      expect(source).toContain(".immutable // false");
      expect(source).toContain('[ "$EXACT_TAG" = "$PACKAGE_DIRECTORY@$PACKAGE_VERSION" ]');
      expect(source).toContain('RELEASE_TAG="$EXACT_TAG"');
      expect(source).toContain('TAG="$EXACT_TAG"');
      const bulk = readFileSync(
        new URL(`../.github/workflows/reusable_release-bulk-${operation}.yml`, import.meta.url),
        "utf8",
      );
      expect(bulk).toContain("match-mode: ${{ inputs.match-mode }}");
      expect(bulk).toContain("exact-tag: ${{ inputs.exact-tag }}");
      expect(bulk).not.toContain("matrix.directory, matrix.version");
    });
  }
});
