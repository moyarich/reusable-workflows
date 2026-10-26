import { describe, expect, it } from "vitest";
import {
  changelogSection,
  hasMeaningfulGeneratedBody,
} from "../src/release-draft-sync/release-note-rules.ts";

describe("pure release-note rules", () => {
  it("extracts release-specific changelog notes", () => {
    const markdown =
      "# Changelog\n\n## [1.2.3]\n\n- Fixed release metadata\n\n## [1.2.2]\n\n- Old notes";
    expect(changelogSection(markdown, "1.2.3")).toBe(
      "- Fixed release metadata",
    );
    expect(changelogSection(markdown, "9.0.0")).toBe("");
  });
  it("recognizes empty boilerplate and meaningful notes", () => {
    expect(hasMeaningfulGeneratedBody("### Changes\n- No changes.")).toBe(
      false,
    );
    expect(
      hasMeaningfulGeneratedBody("### Changes\n- Fix workflow dispatch"),
    ).toBe(true);
  });
});
