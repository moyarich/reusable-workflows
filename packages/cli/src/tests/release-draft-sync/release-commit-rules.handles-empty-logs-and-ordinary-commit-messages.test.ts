import { describe, expect, it } from "vitest";
import { formatReleaseCommits } from "../../release-draft-sync/commit-rules.ts";

describe("pure release commit formatting", () => {
  it("handles empty logs and ordinary commit messages", () => {
    expect(formatReleaseCommits("")).toBe("");
    expect(formatReleaseCommits("Improve documentation\tabc123")).toBe(
      "- Improve documentation (abc123)",
    );
  });
});
