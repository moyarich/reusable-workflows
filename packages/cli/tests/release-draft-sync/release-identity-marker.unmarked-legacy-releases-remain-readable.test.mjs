import { test, assert } from "vitest";
import { validateReleaseMarker } from "../../src/release-draft-sync/identity.ts";
const identity = {
  package: "@moyarich/workspace-tools",
  version: "0.2.0",
  tag: "@moyarich/workspace-tools@0.2.0",
  target: ".",
  "seed-sha": "0123456789012345678901234567890123456789",
  source: "changelog",
};
test("unmarked legacy releases remain readable", () => {
  assert.deepEqual(validateReleaseMarker("Release notes", identity), {
    format: "none",
  });
});
