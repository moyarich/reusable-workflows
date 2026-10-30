import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const workflow = readFileSync(
  new URL(
    "../../../../.github/workflows/reusable_release-drafter.yml",
    import.meta.url,
  ),
  "utf8",
);

describe("release draft version substitution", () => {
  it("supports canonical and legacy release-name version placeholders", () => {
    expect(workflow).toContain('.replaceAll("{{VERSION}}", versionToken)');
    expect(workflow).toContain(
      '.replaceAll("$RESOLVED_VERSION", versionToken)',
    );
  });

  it("uses the resolved version in the install instructions", () => {
    expect(workflow).toContain('process.env.PACKAGE_NAME + "@" + versionToken');
    expect(workflow).not.toContain(
      'process.env.PACKAGE_NAME + "@$RESOLVED_VERSION',
    );
  });
});
