import { readFileSync, writeFileSync } from "node:fs";
import { parseDocument } from "yaml";

export interface YamlUpdate {
  path: string[];
  value: unknown;
}

export interface YamlUpdateOptions {
  file: string;
  updates: YamlUpdate[];
  check?: boolean;
}

/** Apply declarative updates to existing YAML keys while retaining unrelated content. */
export function syncYamlValues({
  file,
  updates,
  check = false,
}: YamlUpdateOptions): boolean {
  if (!/\.ya?ml$/.test(file) || file.startsWith("/") || file.includes("\\") || file.split("/").includes(".."))
    throw new Error("Invalid YAML file path");
  if (!updates.length) throw new Error("At least one YAML update is required");
  const original = readFileSync(file, "utf8");
  const document = parseDocument(original, { keepSourceTokens: true });
  if (document.errors.length) throw new Error(document.errors.join("; "));
  for (const update of updates) {
    if (
      !Array.isArray(update.path) ||
      !update.path.length ||
      update.path.some((p) => !p)
    )
      throw new Error("Invalid YAML property path");
    if (!document.hasIn(update.path))
      throw new Error("Missing YAML property: " + update.path.join("."));
    document.setIn(update.path, update.value);
  }
  const next = String(document);
  if (next === original) return false;
  if (check) throw new Error("YAML settings are out of sync: " + file);
  writeFileSync(file, next);
  return true;
}
