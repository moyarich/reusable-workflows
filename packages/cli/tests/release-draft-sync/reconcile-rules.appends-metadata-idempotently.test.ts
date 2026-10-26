import { describe, it, expect } from "vitest";
import { ensureMetadata } from "../../src/release-draft-sync/reconcile-rules.ts";
describe("pure release draft reconciliation", () => {
  it("appends metadata idempotently", () => {
    const once = ensureMetadata("Notes", "root", "abc123", "existing");
    expect(ensureMetadata(once, "root", "abc123", "existing")).toBe(once);
  });
});
