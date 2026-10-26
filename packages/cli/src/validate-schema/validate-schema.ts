import Ajv2020 from "ajv/dist/2020.js";
import type { AnySchema, ErrorObject } from "ajv";

export type SchemaValidationResult =
  | { valid: true; errors: [] }
  | { valid: false; error: string; errors: ErrorObject[] };

/** Return a JSON-serializable validation result without changing the data. */
export const validateSchema = (
  schema: AnySchema,
  data: unknown,
  label = "configuration",
): SchemaValidationResult => {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  try {
    const validate = ajv.compile(schema);
    if (validate(data)) return { valid: true, errors: [] };
    return {
      valid: false,
      error: `Invalid ${label}: ${ajv.errorsText(validate.errors)}`,
      errors: validate.errors ?? [],
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error),
      errors: [],
    };
  }
};
