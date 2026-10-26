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
test("legacy markers migrate without losing seed or release notes", () => {
  const legacy =
    "<!-- release-draft-sync:target=@moyarich/workspace-tools -->\n<!-- release-draft-sync:seed-sha=abc123 source=changelog -->\n\nPublic changes";
  const body = writeReleaseMarker(legacy, identity);
  assert.strictEqual(parseReleaseMarker(body)["seed-sha"], "abc123");
  assert.strictEqual(parseReleaseMarker(body).format, "v2");
  assert.match(body, /Public changes/);
});
