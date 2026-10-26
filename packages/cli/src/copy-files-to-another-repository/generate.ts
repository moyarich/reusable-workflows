import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { parseDocument, isMap } from "yaml";

type RecordValue = Record<string, unknown>;
const object = (v: unknown): v is RecordValue =>
  v !== null && typeof v === "object" && !Array.isArray(v);
function patterns(v: unknown, label: string): string[] {
  if (
    !Array.isArray(v) ||
    v.some(
      (x) => typeof x !== "string" || !x || /[/\\]/.test(x) || x.includes(".."),
    )
  )
    throw Error(label + " must contain safe workflow filename patterns");
  return v as string[];
}
function match(name: string, globs: string[]): boolean {
  return globs.some((glob) => {
    const escaped = glob
      .split("*")
      .map((part) =>
        [...part]
          .map((ch) =>
            /^[a-zA-Z0-9_-]$/.test(ch) ? ch : String.fromCharCode(92) + ch,
          )
          .join(""),
      )
      .join(".*");
    return new RegExp("^" + escaped + "$").test(name);
  });
}
function kind(s: string): string {
  if (s.includes("reusable_bulk-npm-publish.yml")) return "npm-monorepo";
  if (s.includes("reusable_npm-publish.yml")) return "npm-single";
  if (s.includes("reusable_vscode-publish.yml")) return "vscode";
  if (s.includes("reusable_browser-extension-publish.yml")) return "browser";
  return "custom";
}
function safeSource(root: string, path: string): string {
  if (!/^\.github\/workflows\/[^/\\]+\.yml$/.test(path) || path.includes(".."))
    throw Error("Unsafe source path: " + path);
  const absolute = resolve(root, path);
  if (
    !existsSync(absolute) ||
    !lstatSync(absolute).isFile() ||
    lstatSync(absolute).isSymbolicLink()
  )
    throw Error("Missing or unsafe source workflow: " + path);
  return absolute;
}
function applyOverride(
  document: ReturnType<typeof parseDocument>,
  patch: RecordValue,
  source: string,
): void {
  const allowed = ["on", "jobs", "env", "defaults", "name", "run-name"];
  if (Object.keys(patch).some((k) => !allowed.includes(k)))
    throw Error("Unsafe workflow override: " + source);
  function walk(target: unknown, value: unknown, location: string): void {
    if (!isMap(target) || !object(value))
      throw Error("Override targets missing key: " + location);
    for (const [key, next] of Object.entries(value)) {
      if (!target.has(key))
        throw Error(
          "Override targets missing key: " +
            (location ? location + "." : "") +
            key,
        );
      const current = target.get(key, true);
      if (object(next) && isMap(current))
        walk(current, next, location ? location + "." + key : key);
      else target.set(key, next);
    }
  }
  walk(document.contents, patch, "");
}
export interface GenerateOptions {
  config: RecordValue;
  repository: string;
  sourceRoot: string;
  output: string;
  workflow?: string;
  existingFiles?: string[];
  destinationPublish?: string;
}
export function generateWorkflows(opts: GenerateOptions): string[] {
  const { config, repository, sourceRoot, output } = opts;
  const source = config.source;
  let files: string[];
  if (object(source)) {
    if (source.directory !== ".github/workflows")
      throw Error("Only .github/workflows source directory is allowed");
    const include = patterns(source.allow, "source.allow");
    const exclude = patterns(source.ignore ?? [], "source.ignore");
    if (!include.length) throw Error("source.allow must not be empty");
    files = readdirSync(join(sourceRoot, ".github/workflows"))
      .filter(
        (name) =>
          name.endsWith(".yml") &&
          match(name, include) &&
          !match(name, exclude),
      )
      .sort()
      .map((name) => ".github/workflows/" + name);
  } else {
    const raw = config["source-files"];
    if (!Array.isArray(raw) || !raw.length || new Set(raw).size !== raw.length)
      throw Error("source-files must be a nonempty list without duplicates");
    files = raw as string[];
  }
  files.forEach((file) => safeSource(sourceRoot, file));
  if (
    (config["destination-directory"] ?? ".github/workflows") !==
    ".github/workflows"
  )
    throw Error("Only .github/workflows destination is allowed");
  const repositories = config.repositories;
  if (!Array.isArray(repositories))
    throw Error("repositories must be a nonempty list");
  const targets = repositories.filter(
    (x) => object(x) && x.name === repository,
  );
  if (targets.length !== 1)
    throw Error("Expected exactly one repository config for " + repository);
  const repositoryConfig = targets[0] as RecordValue;
  const defaults = config.defaults ?? {};
  const profiles = config.profiles ?? {};
  if (!object(defaults) || !object(profiles))
    throw Error("defaults and profiles must be mappings");
  const names = repositoryConfig.profiles ?? [];
  if (!Array.isArray(names) || names.some((name) => typeof name !== "string"))
    throw Error("Copier profiles must be an array of profile names");
  if (new Set(names).size !== names.length)
    throw Error("Duplicate copier profiles");
  const selectedProfiles = names.map((name: string) => {
    if (!Object.hasOwn(profiles, name))
      throw Error("Unknown copier profile: " + name);
    const settings = profiles[name];
    if (!object(settings))
      throw Error("Copier profile must be a mapping: " + name);
    return settings;
  });
  // Profiles are applied in declared order; repository settings are last.
  const layers = [defaults, ...selectedProfiles, repositoryConfig];
  const target = Object.assign({}, ...layers) as RecordValue;
  const overrides = target.overrides ?? {};
  if (!object(overrides)) throw Error("overrides must be a mapping");
  if (Object.keys(overrides).some((k) => !files.includes(k)))
    throw Error("overrides must reference available canonical source-files");
  const selectedNames = new Set<string>();
  for (const layer of layers) {
    const included = patterns(layer.include ?? [], "include");
    const excluded = patterns(layer.exclude ?? [], "exclude");
    for (const f of files) {
      const name = basename(f);
      if (match(name, included)) selectedNames.add(f);
      if (match(name, excluded)) selectedNames.delete(f);
    }
  }
  const eligible = files.filter((f) => selectedNames.has(f));
  if (Object.keys(overrides).some((k) => !eligible.includes(k)))
    throw Error("overrides cannot target excluded files");
  let selected = eligible;
  if (opts.workflow) {
    if (!/^[^/\\]+\.yml$/.test(opts.workflow) || opts.workflow.includes(".."))
      throw Error("Invalid canonical workflow filename");
    if (!files.some((f) => basename(f) === opts.workflow))
      throw Error(
        "Workflow not included in canonical source selection: " + opts.workflow,
      );
    if (!eligible.some((f) => basename(f) === opts.workflow))
      throw Error(
        "Workflow excluded by destination configuration: " + opts.workflow,
      );
    selected = eligible.filter((f) => basename(f) === opts.workflow);
  }
  if (selected.includes(".github/workflows/publish.yml")) {
    if (opts.destinationPublish === undefined)
      throw Error(
        "Destination publish.yml content required for compatibility validation",
      );
    const canonical = kind(
      readFileSync(
        safeSource(sourceRoot, ".github/workflows/publish.yml"),
        "utf8",
      ),
    );
    const destination = kind(opts.destinationPublish);
    if (canonical !== destination)
      throw Error(
        "Incompatible publish.yml for " +
          repository +
          ": destination=" +
          destination +
          ", canonical=" +
          canonical,
      );
  }
  const selectors = selected.filter(
    (f) =>
      [
        "publish.yml",
        "release.yml",
        "release-draft.yml",
        "restore-release.yml",
        "reset-release.yml",
        "check-dist.yml",
      ].includes(basename(f)) &&
      readFileSync(safeSource(sourceRoot, f), "utf8").includes(
        "packages/example",
      ),
  );
  if (
    selectors.length &&
    opts.existingFiles &&
    !selected.some((f) => basename(f) === "sync-release-package-choices.yml")
  ) {
    selected = selected.filter((f) => !selectors.includes(f));
  }
  for (const file of selected) {
    const sourceFile = safeSource(sourceRoot, file);
    let text = readFileSync(sourceFile, "utf8");
    if (Object.hasOwn(overrides, file)) {
      const patch = overrides[file];
      if (!object(patch)) throw Error("Unsafe workflow override: " + file);
      const doc = parseDocument(text, { keepSourceTokens: true });
      if (doc.errors.length) throw Error("Invalid source workflow: " + file);
      applyOverride(doc, patch, file);
      text = String(doc);
    }
    const destination = join(output, file);
    mkdirSync(join(output, ".github/workflows"), { recursive: true });
    writeFileSync(destination, text);
  }
  return selected;
}
