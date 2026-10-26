import { describe, expect, it } from "vitest";
import { hasMeaningfulGeneratedBody } from "../../release-draft-sync/release-note-rules.ts";
describe("pure release-note rules", () => {
  it("recognizes empty boilerplate and meaningful notes", () => {
    expect(hasMeaningfulGeneratedBody("### Changes\n- No changes.")).toBe(
      false,
    );
    expect(
      hasMeaningfulGeneratedBody("### Changes\n- Fix workflow dispatch"),
    ).toBe(true);
  });
});
