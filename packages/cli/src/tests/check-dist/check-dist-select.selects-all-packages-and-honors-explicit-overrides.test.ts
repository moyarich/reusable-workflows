import { describe, expect, it } from "vitest";
import { selectDistributionTargets } from "../../check-dist/select-targets.ts";

const packages = [
  { name: "@example/actions", directory: "packages/actions" },
  { name: "@example/cli", directory: "packages/cli" },
];

describe("pure distribution target selection", () => {
  it("selects all packages and honors explicit overrides", () => {
    const result = selectDistributionTargets({
      discovered: packages,
      config: {},
      requested: "all",
      distPathOverride: "custom",
      buildCommandOverride: "npm run generate",
    });
    expect(result.singlePackage).toBe(false);
    expect(result.matrix.include).toHaveLength(2);
    expect(
      result.matrix.include.every(
        (p) =>
          p.distTemplate === "custom" && p.buildCommand === "npm run generate",
      ),
    ).toBe(true);
  });
});
