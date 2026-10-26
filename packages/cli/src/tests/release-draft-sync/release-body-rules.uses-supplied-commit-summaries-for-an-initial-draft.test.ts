import { describe, expect, it } from "vitest";
import { reconcileReleaseBody } from "../../release-draft-sync/release-body-rules.ts";

const inputs = {
  existingBody: "",
  generatedBody: "",
  curatedNotes: "",
  commitNotes: "",
  targetKey: "root",
  seedSha: "abc123",
};

describe("pure release body selection", () => {
  it("uses supplied commit summaries for an initial draft", () => {
    const body = reconcileReleaseBody({
      ...inputs,
      commitNotes: "- Ship workflow (abc)",
    });
    expect(body).toContain("Ship workflow (abc)");
    expect(body).toContain("source=commits");
  });
});
