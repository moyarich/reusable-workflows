import { test, assert } from "vitest";
import { normalizeInputs } from "../../src/workflow-dispatch/dispatch-rules.ts";
const sha = "a".repeat(40);
test("normalizes scalar dispatch inputs and injects SHA", () => {
  assert.deepEqual(
    normalizeInputs('{"yes":true,"count":2}', "checkout-sha", sha),
    { yes: "true", count: "2", "checkout-sha": sha },
  );
  assert.throws(
    () => normalizeInputs('{"nested":{}}', "", sha),
    /scalar|must be/,
  );
});
