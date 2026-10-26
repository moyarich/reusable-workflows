import { test, assert } from "vitest";
import { parseReleaseMarker } from "../../src/release-draft-sync/identity.ts";
test("rejects unsupported future marker versions without legacy fallback", () => {
  const unknown = "<!-- release-draft-sync:v3\npackage=test\n-->";
  assert.throws(
    () => parseReleaseMarker(unknown),
    /Unsupported release identity marker version: v3/,
  );
  assert.throws(
    () =>
      parseReleaseMarker(
        unknown + "\n<!-- release-draft-sync:target=legacy -->",
      ),
    /Unsupported/,
  );
});
