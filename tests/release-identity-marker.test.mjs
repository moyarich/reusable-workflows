import test from "node:test";
import assert from "node:assert/strict";
import { parseReleaseMarker, validateReleaseMarker, writeReleaseMarker } from "../actions/release-draft-sync/identity.mjs";
const identity = {
  package: "@moyarich/workspace-tools",
  version: "0.2.0",
  tag: "@moyarich/workspace-tools@0.2.0",
  target: ".",
  "seed-sha": "0123456789012345678901234567890123456789",
  source: "changelog"
};
test("roundtrip v2 marker and retain content", () => {
  const body = writeReleaseMarker("### Features\n\n- New CLI", identity);
  assert.equal(parseReleaseMarker(body).tag, identity.tag);
  assert.match(body, /- New CLI/);
  assert.equal(writeReleaseMarker(body, identity), body);
});
test("legacy markers migrate without losing seed or release notes", () => {
  const legacy = "<!-- release-draft-sync:target=@moyarich/workspace-tools -->\n<!-- release-draft-sync:seed-sha=abc123 source=changelog -->\n\nPublic changes";
  const body = writeReleaseMarker(legacy, identity);
  assert.equal(parseReleaseMarker(body)["seed-sha"], "abc123");
  assert.equal(parseReleaseMarker(body).format, "v2");
  assert.match(body, /Public changes/);
});
test("version, tag, and package mismatches fail closed", () => {
  const body = writeReleaseMarker("Notes", identity);
  for (const key of ["package", "version", "tag", "target"]) {
    assert.throws(() => validateReleaseMarker(body, { ...identity, [key]: "incorrect" }), /mismatch/);
    assert.throws(() => writeReleaseMarker(body, { ...identity, [key]: "incorrect" }), /mismatch/);
  }
});
test("unmarked legacy releases remain readable", () => {
  assert.deepEqual(validateReleaseMarker("Release notes", identity), { format: "none" });
});
test("malformed and duplicate identity markers are rejected", () => {
  const body = writeReleaseMarker("Notes", identity);
  assert.throws(() => parseReleaseMarker(body + "\n" + body), /Multiple/);
  assert.throws(() => parseReleaseMarker(body.replace("tag=" + identity.tag, "tag=")), /Invalid or duplicate/);
});
