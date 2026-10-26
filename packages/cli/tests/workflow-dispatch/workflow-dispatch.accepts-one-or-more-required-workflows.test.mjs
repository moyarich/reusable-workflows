import { test, assert } from "vitest";
import { parseRequiredWorkflows } from "../../src/workflow-dispatch/dispatch-rules.ts";
test("accepts one or more required workflows", () => {
  assert.deepEqual(parseRequiredWorkflows("checks.yml"), ["checks.yml"]);
  assert.deepEqual(parseRequiredWorkflows("alpha.yml, beta.yaml"), [
    "alpha.yml",
    "beta.yaml",
  ]);
  assert.throws(() => parseRequiredWorkflows(""), /one or more/);
  assert.throws(() => parseRequiredWorkflows("a.yml,a.yml"), /Duplicate/);
});
