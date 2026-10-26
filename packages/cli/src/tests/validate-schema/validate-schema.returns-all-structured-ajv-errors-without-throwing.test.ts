import { describe, expect, it } from "vitest";
import { validateSchema } from "../../validate-schema/validate-schema.js";

describe("validateSchema results", () => {
  it("returns all structured Ajv errors without throwing", () => {
    const result = validateSchema(
      {
        type: "object",
        required: ["name"],
        properties: { count: { type: "integer" } },
      },
      { count: "two" },
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "required",
          params: { missingProperty: "name" },
        }),
        expect.objectContaining({
          instancePath: "/count",
          keyword: "type",
          params: { type: "integer" },
        }),
      ]),
    );
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
});
