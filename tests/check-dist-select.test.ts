import { describe, expect, it } from "vitest";
import { selectDistributionTargets } from "../packages/cli/src/check-dist/select.ts";

const packages = [
  { name: "@example/actions", directory: "packages/actions" },
  { name: "@example/cli", directory: "packages/cli" },
];

describe("pure distribution target selection", () => {
  it("selects one package and applies configuration precedence", () => {
    const config = {
      packages: {
        all: { distPath: "default", commitDist: false },
        "@example/actions": { distPath: "by-name" },
        "packages/actions": { distPath: "actions", commitDist: true },
      },
    };
    const snapshot = JSON.stringify(config);
    const result = selectDistributionTargets({
      discovered: packages,
      config,
      requested: "packages/actions",
    });
    expect(result.singlePackage).toBe(true);
    expect(result.matrix.include).toEqual([
      expect.objectContaining({
        distTemplate: "actions",
        commitDist: true,
        buildCommand: "npm run build --workspace @example/actions",
        artifactSuffix: "actions",
      }),
    ]);
    expect(JSON.stringify(config)).toBe(snapshot);
  });

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
