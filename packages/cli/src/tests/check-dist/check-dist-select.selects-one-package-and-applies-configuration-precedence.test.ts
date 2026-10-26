import { describe, expect, it } from "vitest";
import { selectDistributionTargets } from "../../check-dist/select-targets.ts";

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
});
