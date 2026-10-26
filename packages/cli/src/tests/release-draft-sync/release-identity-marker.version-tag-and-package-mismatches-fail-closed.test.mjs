import { test, assert } from "vitest";
import {
  validateReleaseMarker,
  writeReleaseMarker,
} from "../../release-draft-sync/identity.ts";
const identity = {
  package: "@moyarich/workspace-tools",
  version: "0.2.0",
  tag: "@moyarich/workspace-tools@0.2.0",
  target: ".",
  "seed-sha": "0123456789012345678901234567890123456789",
  source: "changelog",
};
test("version, tag, and package mismatches fail closed", () => {
  const body = writeReleaseMarker("Notes", identity);
  for (const key of ["package", "version", "tag", "target"]) {
    assert.throws(
      () => validateReleaseMarker(body, { ...identity, [key]: "incorrect" }),
      /mismatch/,
    );
    assert.throws(
      () => writeReleaseMarker(body, { ...identity, [key]: "incorrect" }),
      /mismatch/,
    );
  }
});
