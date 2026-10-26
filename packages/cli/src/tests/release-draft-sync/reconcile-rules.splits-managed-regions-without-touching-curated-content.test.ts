import { describe, it, expect } from "vitest";
import { splitGeneratedRegion } from "../../release-draft-sync/reconcile-rules.ts";
describe("pure release draft reconciliation", () => {
  it("splits managed regions without touching curated content", () => {
    const body =
      "Curated\n<!-- release-draft-sync:generated:start -->\n### Fixes\n<!-- release-draft-sync:generated:end -->\nFooter";
    expect(splitGeneratedRegion(body)).toEqual({
      before: "Curated",
      generated: "### Fixes",
      after: "Footer",
    });
    expect(splitGeneratedRegion("Plain release notes")).toBeNull();
  });
});
