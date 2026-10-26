import { describe, it, expect } from "vitest";
import { mergeGeneratedEntries } from "../../release-draft-sync/reconcile-rules.ts";
describe("pure release draft reconciliation", () => {
  it("merges PR entries once while preserving categories", () => {
    const original =
      "### Features\n\n- First <!-- release-draft-sync:pr=10 -->";
    const incoming =
      "### Features\n\n- First <!-- release-draft-sync:pr=10 -->\n- Second <!-- release-draft-sync:pr=11 -->";
    const merged = mergeGeneratedEntries(original, incoming);
    expect(merged.match(/pr=10/g)).toHaveLength(1);
    expect(merged.match(/pr=11/g)).toHaveLength(1);
    expect(mergeGeneratedEntries(merged, incoming)).toBe(merged);
    expect(original).not.toContain("Second");
  });
});
