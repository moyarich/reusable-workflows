import { test, assert } from "vitest";
import {
  parseReleaseMarker,
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
test("malformed and duplicate identity markers are rejected", () => {
  const body = writeReleaseMarker("Notes", identity);
  assert.throws(() => parseReleaseMarker(body + "\n" + body), /Multiple/);
  assert.throws(
    () => parseReleaseMarker(body.replace("tag=" + identity.tag, "tag=")),
    /Invalid or duplicate/,
  );
});
