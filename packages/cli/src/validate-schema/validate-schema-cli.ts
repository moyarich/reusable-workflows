import { readFileSync } from "node:fs";
import { Command } from "commander";
import { parse } from "yaml";
import { validateSchema } from "./validate-schema.js";

/** Create a command for explicitly validating a JSON or YAML document. */
export const createValidateSchemaCommand = (): Command => {
  const command = new Command("validate-schema")
    .description("Validate a JSON or YAML file against a JSON schema")
    .requiredOption("--schema <path>", "JSON schema file")
    .requiredOption("--file <path>", "JSON or YAML document to validate")
    .action((options: { schema: string; file: string }) => {
      try {
        const schema = JSON.parse(readFileSync(options.schema, "utf8"));
        const data: unknown = parse(readFileSync(options.file, "utf8"), {
          merge: true,
        });
        const result = validateSchema(schema, data, options.file);
        console.log(
          JSON.stringify({
            ...result,
            file: options.file,
            schema: options.schema,
          }),
        );
        if (!result.valid) process.exitCode = 1;
      } catch (error) {
        console.log(
          JSON.stringify({
            valid: false,
            file: options.file,
            schema: options.schema,
            error: error instanceof Error ? error.message : String(error),
            errors: [],
          }),
        );
        process.exitCode = 1;
      }
    });
  return command;
};
