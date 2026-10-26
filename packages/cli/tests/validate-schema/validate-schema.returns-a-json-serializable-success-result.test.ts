import { describe, expect, it } from "vitest";
import { validateSchema } from "../../src/validate-schema/validate-schema.js";

describe("validateSchema results", () => {
  it("returns a JSON-serializable success result", () => {
    expect(validateSchema({ type: "boolean" }, true)).toEqual({
      valid: true,
      errors: [],
    });
  });
});
