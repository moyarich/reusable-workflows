import { describe, expect, it } from "vitest";
import { selectDistributionTargets } from "../../check-dist/select-targets.ts";

const packages = [
  { name: "@example/actions", directory: "packages/actions" },
  { name: "@example/cli", directory: "packages/cli" },
];

describe("pure distribution target selection", () => {
  it("rejects unknown selections without performing I/O", () => {
    expect(() =>
      selectDistributionTargets({
        discovered: packages,
        config: {},
        requested: "missing",
      }),
    ).toThrow("No packages match: missing");
  });
});
