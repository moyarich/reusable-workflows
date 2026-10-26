import { test, assert } from "vitest";
import { normalizeWorkflowInputs } from "../../workflow-dispatch/dispatch-rules.ts";
const sha = "a".repeat(40);
test("rejects invalid workflow_inputs entries", () => {
  assert.throws(() => normalizeWorkflowInputs("[]", "", sha), /JSON object/);
  assert.throws(
    () => normalizeWorkflowInputs('{"bad/path.yml":{}}', "", sha),
    /filename/,
  );
  assert.throws(
    () => normalizeWorkflowInputs('{"x.yml":{"nested":{}}}', "", sha),
    /must be/,
  );
});
