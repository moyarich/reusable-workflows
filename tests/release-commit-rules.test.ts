import { describe, expect, it } from "vitest";
import { formatReleaseCommits } from "../packages/cli/src/release-draft-sync/commit-rules.ts";

describe("pure release commit formatting", () => {
  it("filters maintenance commits, deduplicates titles, and retains hashes", () => {
    const input = [
      "feat: Add CLI validation\tabc123",
      "ci: Update workflow\tdef456",
      "fix: Repair dispatch (#43)\tdeadbe",
      "fix: Repair dispatch\tbeef12",
      "release: publish\t112233",
    ].join("\n");
    expect(formatReleaseCommits(input)).toBe(
      "- Add CLI validation (abc123)\n- Repair dispatch (deadbe)",
    );
  });
  it("handles empty logs and ordinary commit messages", () => {
    expect(formatReleaseCommits("")).toBe("");
    expect(formatReleaseCommits("Improve documentation\tabc123")).toBe("- Improve documentation (abc123)");
  });
});
