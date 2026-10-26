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
test("dispatches legacy and v2 markers independently", () => {
  const legacy = "<!-- release-draft-sync:target=@moyarich/workspace-tools -->";
  assert.strictEqual(parseReleaseMarker(legacy)?.format, "legacy");
  const v2 = writeReleaseMarker("Notes", identity);
  assert.strictEqual(parseReleaseMarker(v2)?.format, "v2");
});
