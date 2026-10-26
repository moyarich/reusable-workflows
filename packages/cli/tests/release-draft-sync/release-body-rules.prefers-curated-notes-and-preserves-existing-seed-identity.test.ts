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
  it("prefers curated notes and preserves existing seed identity", () => {
    const body = reconcileReleaseBody({
      ...inputs,
      existingBody:
        "<!-- release-draft-sync:target=root -->\n<!-- release-draft-sync:seed-sha=old source=existing -->\nOlder",
      curatedNotes: "## 1.2.3\n- Fix",
    });
    expect(body).toContain("## 1.2.3");
    expect(body).toContain("seed-sha=old");
    expect(body).not.toContain("Older");
    expect(body).not.toContain("seed-sha=abc123");
  });
});
