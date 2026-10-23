import { describe, it, expect } from "vitest";
import { mergeGeneratedEntries, splitGeneratedRegion, ensureMetadata } from "../packages/cli/src/release-draft-sync/reconcile-rules.ts";

describe("pure release draft reconciliation", () => {
  it("merges PR entries once while preserving categories", () => {
    const original = "### Features\n\n- First <!-- release-draft-sync:pr=10 -->";
    const incoming = "### Features\n\n- First <!-- release-draft-sync:pr=10 -->\n- Second <!-- release-draft-sync:pr=11 -->";
    const merged = mergeGeneratedEntries(original, incoming);
    expect(merged.match(/pr=10/g)).toHaveLength(1);
    expect(merged.match(/pr=11/g)).toHaveLength(1);
    expect(mergeGeneratedEntries(merged, incoming)).toBe(merged);
    expect(original).not.toContain("Second");
  });
  it("splits managed regions without touching curated content", () => {
    const body = "Curated\n<!-- release-draft-sync:generated:start -->\n### Fixes\n<!-- release-draft-sync:generated:end -->\nFooter";
    expect(splitGeneratedRegion(body)).toEqual({ before: "Curated", generated: "### Fixes", after: "Footer" });
    expect(splitGeneratedRegion("Plain release notes")).toBeNull();
  });
  it("appends metadata idempotently", () => {
    const once = ensureMetadata("Notes", "root", "abc123", "existing");
    expect(ensureMetadata(once, "root", "abc123", "existing")).toBe(once);
  });
});
