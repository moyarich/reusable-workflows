import { describe, expect, it } from "vitest";
import { findReleaseByTag } from "../../validate-release-identity/release-lookup.ts";
describe("pure GitHub release lookup", () => {
  it("does not match malformed records", () => {
    expect(
      findReleaseByTag(JSON.stringify([[null, "v1.1.0", {}]]), "v1.1.0"),
    ).toBeUndefined();
  });
});
