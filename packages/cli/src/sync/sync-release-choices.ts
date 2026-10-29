import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename } from "node:path";

import { isMap, parseDocument } from "yaml";
import {
  syncYamlValues,
  type YamlUpdate,
} from "../sync-yaml-values/sync-yaml-values.js";
import { InvalidArgumentError } from "commander";

const WORKFLOW_PREFIX = ".github/workflows/";
const VSCODE_WORKFLOW = "publish-vscode-vsx.yml";
const PUBLISH_WORKFLOW = "publish.yml";
const INPUT_PATH = ["on", "workflow_dispatch", "inputs", "package"];

export const DEFAULT_WORKFLOW = ".github/workflows/release.yml";

interface Options {
  workflowFile: string;
  workflowFiles: string[];
  releasePackages: string[];
  publishPackages: string[];
}

const parseJson = (value: string, fallback: string): unknown => {
  try {
    return JSON.parse(value || fallback);
  } catch {
    throw new InvalidArgumentError("must be valid JSON");
  }
};

export const parseFileList = (value: string): string[] => {
  const parsed = parseJson(value, "[]");
  if (!Array.isArray(parsed) || parsed.some((x) => typeof x !== "string")) {
    throw new InvalidArgumentError("must be a JSON array of strings");
  }
  return parsed;
};

/** Parse `{ included: [{ directory }] }` into a sorted, de-duplicated list. */
export const parseIncluded = (value: string): string[] => {
  const parsed = parseJson(value, "{}") as {
    included?: { directory: string }[];
  } | null;
  const directories = (parsed?.included ?? []).map((x) => x.directory);
  return [...new Set(directories)].sort();
};

export const syncReleaseChoices = (opts: Options) => {
  const targets = opts.workflowFiles.length
    ? opts.workflowFiles
    : [opts.workflowFile];

  const vscode = [
    ".",
    ...["packages", "apps"].flatMap((root) =>
      existsSync(root)
        ? readdirSync(root, { withFileTypes: true })
            .filter((d) => d.isDirectory())
            .map((d) => `${root}/${d.name}`)
        : [],
    ),
  ]
    .filter((dir) => {
      const manifest = `${dir}/package.json`;
      if (!existsSync(manifest)) return false;
      try {
        const data = JSON.parse(readFileSync(manifest, "utf8"));
        return Boolean(
          data.engines?.vscode || existsSync(`${dir}/extension.manifest.json`),
        );
      } catch {
        return false;
      }
    })
    .sort();

  for (const file of targets) {
    if (
      !file.startsWith(WORKFLOW_PREFIX) ||
      file.split("/").includes("..") ||
      !/\.ya?ml$/.test(file)
    ) {
      throw new Error(`Invalid workflow file: ${file}`);
    }
    if (!existsSync(file)) {
      console.log(`Skipped missing ${file}`);
      continue;
    }

    const document = parseDocument(readFileSync(file, "utf8"));
    if (document.errors.length) throw new Error(`Invalid YAML in ${file}`);
    if (!isMap(document.getIn(INPUT_PATH, true))) {
      console.log(`Preserved selector: ${file}`);
      continue;
    }

    const kind = basename(file);
    const isVscode = kind === VSCODE_WORKFLOW;
    const directories = isVscode
      ? vscode
      : kind === PUBLISH_WORKFLOW
        ? opts.publishPackages
        : opts.releasePackages;
    if (!directories.length) {
      console.log(`Preserved empty selection: ${file}`);
      continue;
    }

    const options = isVscode ? directories : ["all", ...directories];
    const updates: YamlUpdate[] = [
      {
        path: [...INPUT_PATH, "description"],
        value: isVscode
          ? "Select a VS Code extension workspace"
          : "Select a publishable workspace package",
      },
      { path: [...INPUT_PATH, "required"], value: true },
      { path: [...INPUT_PATH, "type"], value: "choice" },
      { path: [...INPUT_PATH, "default"], value: options[0] },
      { path: [...INPUT_PATH, "options"], value: options },
    ];
    console.log(
      syncYamlValues({ file, updates, createMissing: true })
        ? `Updated ${file}`
        : `Already current: ${file}`,
    );
  }
};
