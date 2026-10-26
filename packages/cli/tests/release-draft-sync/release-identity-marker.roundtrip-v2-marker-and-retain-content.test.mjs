import { test, assert } from "vitest";
import {
  parseReleaseMarker,
  writeReleaseMarker,
} from "../../src/release-draft-sync/identity.ts";
const identity = {
  package: "@moyarich/workspace-tools",
  version: "0.2.0",
  tag: "@moyarich/workspace-tools@0.2.0",
  target: ".",
  "seed-sha": "0123456789012345678901234567890123456789",
  source: "changelog",
};
test("roundtrip v2 marker and retain content", () => {
  const body = writeReleaseMarker("### Features\n\n- New CLI", identity);
  assert.strictEqual(parseReleaseMarker(body).tag, identity.tag);
  assert.match(body, /- New CLI/);
  assert.strictEqual(writeReleaseMarker(body, identity), body);
});
