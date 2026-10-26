import { describe, expect, it } from "vitest";
import { validateSchema } from "../../validate-schema/validate-schema.js";

describe("validateSchema results", () => {
  it("returns schema compilation failures without throwing", () => {
    expect(validateSchema({ type: "invalid-type" }, {})).toMatchObject({
      valid: false,
      error: expect.any(String),
      errors: [],
    });
  });
});
