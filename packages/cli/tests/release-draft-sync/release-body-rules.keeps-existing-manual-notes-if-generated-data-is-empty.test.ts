import { describe, expect, it } from "vitest";
import { reconcileReleaseBody } from "../../src/release-draft-sync/release-body-rules.ts";

const inputs = {
  existingBody: "",
  generatedBody: "",
  curatedNotes: "",
  commitNotes: "",
  targetKey: "root",
  seedSha: "abc123",
};

describe("pure release body selection", () => {
  it("keeps existing manual notes if generated data is empty", () => {
    expect(
      reconcileReleaseBody({ ...inputs, existingBody: "Manual notes" }),
    ).toContain("Manual notes");
  });
});
