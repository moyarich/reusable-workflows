import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { createValidateSchemaCommand } from "../../src/validate-schema/validate-schema-cli.js";

const directory = mkdtempSync(join(tmpdir(), "validate-schema-cli-"));
const schema = join(directory, "schema.json");
writeFileSync(
  schema,
  JSON.stringify({
    type: "object",
    required: ["enabled"],
    properties: { enabled: { type: "boolean" } },
  }),
);
afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = 0;
});
describe("validate-schema command", () => {
  it("accepts valid YAML and JSON: %s (case 2)", () => {
    const contents = '{"enabled":true}';
    const file = join(directory, "valid.yml");
    writeFileSync(file, contents);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    createValidateSchemaCommand().parse(["--schema", schema, "--file", file], {
      from: "user",
    });
    expect(JSON.parse(log.mock.calls[0][0])).toEqual({
      valid: true,
      errors: [],
      file,
      schema,
    });
  });
});
afterAll(() => rmSync(directory, { recursive: true, force: true }));
