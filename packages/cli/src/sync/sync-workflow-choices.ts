import { readFileSync } from "node:fs";

import { parse } from "yaml";
import { syncYamlValues } from "../sync-yaml-values/sync-yaml-values.ts";

const MAX_CHOICES = 100;

interface Options {
  source: string;
  valuesPath: string;
  valueField?: string;
  prepend?: string;
  input: string;
  default: string;
  workflow: string;
  check?: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const syncWorkflowChoices = (opts: Options) => {
  if (
    opts.source.split("/").includes("..") ||
    !/\.(?:ya?ml|json)$/.test(opts.source)
  ) {
    throw new Error("Source must be a safe YAML or JSON file");
  }

  const data: unknown = parse(readFileSync(opts.source, "utf8"));
  const keys = opts.valuesPath.split(".");
  let values: unknown = data;
  for (const key of keys) {
    if (!key || !isRecord(values)) {
      throw new Error(`Missing values path: ${opts.valuesPath}`);
    }
    values = values[key];
  }
  if (!Array.isArray(values)) {
    throw new Error("Values path must resolve to an array");
  }

  const { valueField } = opts;
  const extracted = values.map((item: unknown): unknown => {
    if (!valueField) return item;
    if (!isRecord(item)) {
      throw new Error("Expected objects when --value-field is used");
    }
    return item[valueField];
  });
  if (extracted.some((item) => typeof item !== "string" || !item)) {
    throw new Error("Choice values must be nonempty strings");
  }

  const options = [
    ...(opts.prepend === undefined ? [] : [opts.prepend]),
    ...(extracted as string[]),
  ];
  if (
    new Set(options).size !== options.length ||
    options.length > MAX_CHOICES
  ) {
    throw new Error("Invalid or duplicate choice options");
  }
  if (!options.includes(opts.default)) {
    throw new Error("Default must be an available option");
  }

  const base = ["on", "workflow_dispatch", "inputs", opts.input];
  const changed = syncYamlValues({
    file: opts.workflow,
    updates: [
      { path: [...base, "type"], value: "choice" },
      { path: [...base, "required"], value: true },
      { path: [...base, "default"], value: opts.default },
      { path: [...base, "options"], value: options },
    ],
    check: opts.check ?? false,
  });
  console.log(
    changed
      ? "Updated workflow dispatch choices"
      : "Workflow dispatch choices already current",
  );
};
