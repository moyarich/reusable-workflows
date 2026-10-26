import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateSchema } from "../validate-schema/validate-schema.js";

import { parse } from "yaml";
import { generateWorkflows } from "../copy-files-to-another-repository/generate.js";
import copyConfigSchema from "../schemas/copy-config.schema.json" with { type: "json" };

interface Options {
  config: string;
  schema?: string;
  repository?: string;
  plan?: boolean;
  output?: string;
  existingFiles?: string;
  destinationPublishFile?: string;
  sourceRoot: string;
  workflow: string;
}

interface Repository {
  name: string;
  branch?: string;
  profiles?: string[];
}

interface CopierConfig extends Record<string, unknown> {
  source: { repository: string };
  defaults?: { branch?: string };
  profiles?: Record<string, unknown>;
  repositories: Repository[];
}

export const copyWorkflow = (opts: Options) => {
  const requestedRepository =
    opts.repository === "all" ? "" : (opts.repository ?? "");
  const selectedWorkflow = opts.workflow === "all" ? "" : opts.workflow;
  const parsedConfig: unknown = parse(readFileSync(opts.config, "utf8"), {
    merge: true,
  });
  const validation = validateSchema(
    opts.schema
      ? JSON.parse(readFileSync(opts.schema, "utf8"))
      : copyConfigSchema,
    parsedConfig,
    "copier configuration",
  );
  if (validation.valid === false) throw new Error(validation.error);
  const config = parsedConfig as CopierConfig;
  const { repositories } = config;
  const profiles = config.profiles ?? {};

  for (const repository of repositories) {
    for (const profile of repository.profiles ?? []) {
      if (!Object.hasOwn(profiles, profile)) {
        throw new Error(`Unknown copier profile: ${profile}`);
      }
    }
  }

  const names = repositories.map((r) => r.name);
  if (new Set(names).size !== names.length) {
    throw new Error("Duplicate copier destination");
  }
  if (requestedRepository && !names.includes(requestedRepository)) {
    throw new Error("Requested repository is not in the allowlist");
  }

  if (opts.plan) {
    const matrix = {
      include: repositories
        .filter((r) => !requestedRepository || r.name === requestedRepository)
        .map((r) => {
          const branch = r.branch ?? config.defaults?.branch;
          if (!branch) throw new Error(`Missing branch for ${r.name}`);
          return { name: r.name, branch, profiles: r.profiles ?? [] };
        }),
    };
    const output =
      `matrix=${JSON.stringify(matrix)}\n` +
      `source_repository=${config.source.repository}\n`;
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(process.env.GITHUB_OUTPUT, output);
    } else {
      process.stdout.write(output);
    }
    return;
  }

  if (!requestedRepository || !opts.output) {
    throw new Error("--repository and --output are required");
  }

  let existingFiles: string[] | undefined;
  if (opts.existingFiles) {
    const parsed: unknown = JSON.parse(
      readFileSync(opts.existingFiles, "utf8"),
    );
    if (!Array.isArray(parsed) || parsed.some((x) => typeof x !== "string")) {
      throw new Error(
        "--existing-files must contain a JSON array of filenames",
      );
    }
    existingFiles = parsed;
  }

  const publishFile = opts.destinationPublishFile;
  const files = generateWorkflows({
    config,
    repository: requestedRepository,
    sourceRoot: resolve(opts.sourceRoot),
    output: resolve(opts.output),
    workflow: selectedWorkflow,
    existingFiles,
    destinationPublish:
      publishFile && existsSync(publishFile)
        ? readFileSync(publishFile, "utf8")
        : undefined,
  });
  process.stdout.write(
    `${JSON.stringify({ repository: requestedRepository, files })}\n`,
  );
};
