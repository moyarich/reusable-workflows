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
  it("returns JSON without fabricated Ajv errors for unreadable files", () => {
    const file = join(directory, "missing.yml");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    createValidateSchemaCommand().parse(["--schema", schema, "--file", file], {
      from: "user",
    });
    expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({
      valid: false,
      errors: [],
      error: expect.stringContaining("ENOENT"),
    });
    expect(process.exitCode).toBe(1);
  });
});
afterAll(() => rmSync(directory, { recursive: true, force: true }));
