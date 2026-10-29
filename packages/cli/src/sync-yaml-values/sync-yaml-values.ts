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
  createMissing?: boolean;
}

/** Apply declarative updates to existing YAML keys while retaining unrelated content. */
export function syncYamlValues({
  file,
  updates,
  check = false,
  createMissing = false,
}: YamlUpdateOptions): boolean {
  if (
    !/\.ya?ml$/.test(file) ||
    file.startsWith("/") ||
    file.includes("\\") ||
    file.split("/").includes("..")
  )
    throw new Error("Invalid YAML file path");
  if (!updates.length) throw new Error("At least one YAML update is required");
  const original = readFileSync(file, "utf8");
  const document = parseDocument(original, { keepSourceTokens: true });
  if (document.errors.length) throw new Error(document.errors.join("; "));
  let changed = false;
  for (const update of updates) {
    if (
      !Array.isArray(update.path) ||
      !update.path.length ||
      update.path.some((p) => !p)
    )
      throw new Error("Invalid YAML property path");
    if (!document.hasIn(update.path)) {
      if (!createMissing || !document.hasIn(update.path.slice(0, -1)))
        throw new Error("Missing YAML property: " + update.path.join("."));
      if (check) throw new Error("YAML settings are out of sync: " + file);
      document.setIn(update.path, update.value);
      changed = true;
      continue;
    }
    const node = document.getIn(update.path, true);
    const current =
      node && typeof node === "object" && "toJSON" in node
        ? (node as { toJSON(): unknown }).toJSON()
        : node;
    if (JSON.stringify(current) === JSON.stringify(update.value)) continue;
    document.setIn(update.path, update.value);
    changed = true;
  }
  if (!changed) return false;
  if (check) throw new Error("YAML settings are out of sync: " + file);
  const next = String(document);
  writeFileSync(file, next);
  return true;
}
