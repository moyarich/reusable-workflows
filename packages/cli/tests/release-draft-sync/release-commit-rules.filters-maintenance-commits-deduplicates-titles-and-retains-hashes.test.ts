import { describe, expect, it } from "vitest";
import { formatReleaseCommits } from "../../src/release-draft-sync/commit-rules.ts";

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
});
