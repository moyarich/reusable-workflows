import { readdirSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import { syncYamlValues } from "../sync-yaml-values/sync-yaml-values.js";

const WORKFLOW_DIRECTORY = ".github/workflows";
const GLOB_PATTERN = /^[A-Za-z0-9_.*-]+$/;
const MAX_DISPATCH_OPTIONS = 100;

interface SourceConfig {
  directory?: string;
  allow?: unknown;
  ignore?: unknown;
}

const matches = (name: string, globs: string[]): boolean =>
  globs.some((glob) => {
    const regex = glob
      .split("*")
      .map((part) => part.replaceAll(".", "\\."))
      .join(".*");
    return new RegExp(`^${regex}$`).test(name);
  });

interface CopyWorkflowChoicesOptions {
  config: string;
  sourceDirectory: string;
  workflow: string;
  check?: boolean;
}

export const syncCopyWorkflowChoices = (opts: CopyWorkflowChoicesOptions) => {
  const source: SourceConfig | undefined = parse(
    readFileSync(opts.config, "utf8"),
  )?.source;
  if (!source || source.directory !== WORKFLOW_DIRECTORY) {
    throw new Error(`Expected source.directory ${WORKFLOW_DIRECTORY}`);
  }

  const patterns = (kind: "allow" | "ignore"): string[] => {
    const list = source[kind] ?? [];
    if (
      !Array.isArray(list) ||
      list.some((s) => typeof s !== "string" || !GLOB_PATTERN.test(s))
    ) {
      throw new Error(`Invalid source.${kind}`);
    }
    return list;
  };

  const include = patterns("allow");
  const exclude = patterns("ignore");
  if (!include.length) throw new Error("Missing source.allow");

  const files = readdirSync(opts.sourceDirectory, { withFileTypes: true })
    .filter((item) => item.isFile() && item.name.endsWith(".yml"))
    .map((item) => item.name)
    .filter((name) => matches(name, include) && !matches(name, exclude))
    .sort();
  if (!files.length) {
    throw new Error("No canonical workflows match configured patterns");
  }

  const choices = ["all", ...files];
  if (choices.length > MAX_DISPATCH_OPTIONS) {
    throw new Error(
      `GitHub workflow_dispatch supports at most ${MAX_DISPATCH_OPTIONS} options`,
    );
  }

  const changed = syncYamlValues({
    file: opts.workflow,
    check: opts.check ?? false,
    updates: [
      {
        path: ["on", "workflow_dispatch", "inputs", "workflow", "options"],
        value: choices,
      },
    ],
  });
  console.log(
    changed ? "Updated workflow choices" : "Workflow choices already current",
  );
};
