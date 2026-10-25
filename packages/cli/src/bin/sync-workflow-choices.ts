import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { syncYamlValues } from "../workflow-choices/sync.ts";

const args = process.argv.slice(2);
const option = (name: string): string => {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1]) throw new Error("Missing " + name);
  return args[index + 1];
};
const sourceFile = option("--source");
if (
  sourceFile.split("/").includes("..") ||
  !/\.(?:ya?ml|json)$/.test(sourceFile)
)
  throw new Error("Source must be a safe YAML or JSON file");
const data: unknown = parse(readFileSync(sourceFile, "utf8"));
const path = option("--values-path").split(".");
let values: unknown = data;
for (const key of path) {
  if (
    !key ||
    values === null ||
    typeof values !== "object" ||
    Array.isArray(values)
  )
    throw new Error("Missing values path: " + path.join("."));
  values = (values as Record<string, unknown>)[key];
}
if (!Array.isArray(values))
  throw new Error("Values path must resolve to an array");
const fieldIndex = args.indexOf("--value-field");
const field = fieldIndex < 0 ? "" : option("--value-field");
const extracted = values.map((item: unknown): unknown => {
  if (!field) return item;
  if (!item || typeof item !== "object" || Array.isArray(item))
    throw new Error("Expected objects when --value-field is used");
  return (item as Record<string, unknown>)[field];
});
if (extracted.some((item) => typeof item !== "string" || !item))
  throw new Error("Choice values must be nonempty strings");
const prefixIndex = args.indexOf("--prepend");
const prefix = prefixIndex < 0 ? [] : [option("--prepend")];
const input = option("--input");
const options = [...prefix, ...(extracted as string[])];
if (new Set(options).size !== options.length || options.length > 100)
  throw new Error("Invalid or duplicate choice options");
const defaultValue = option("--default");
if (!options.includes(defaultValue))
  throw new Error("Default must be an available option");
const changed = syncYamlValues({
  file: option("--workflow"),
  updates: [
    {
      path: ["on", "workflow_dispatch", "inputs", input, "type"],
      value: "choice",
    },
    {
      path: ["on", "workflow_dispatch", "inputs", input, "required"],
      value: true,
    },
    {
      path: ["on", "workflow_dispatch", "inputs", input, "default"],
      value: defaultValue,
    },
    {
      path: ["on", "workflow_dispatch", "inputs", input, "options"],
      value: options,
    },
  ],
  check: args.includes("--check"),
});
console.log(
  changed
    ? "Updated workflow dispatch choices"
    : "Workflow dispatch choices already current",
);
