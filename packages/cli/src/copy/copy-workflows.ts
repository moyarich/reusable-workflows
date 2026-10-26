import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

import { parse } from "yaml";
import { generateWorkflows } from "../copy-files-to-another-repository/generate.ts";

interface Options {
  config: string;
  schema: string;
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

export const createCopyWorkflow = (opts: Options) => {
  const parsedConfig: unknown = parse(readFileSync(opts.config, "utf8"), {
    merge: true,
  });
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(JSON.parse(readFileSync(opts.schema, "utf8")));
  if (!validate(parsedConfig)) {
    throw new Error(
      `Invalid copier configuration: ${ajv.errorsText(validate.errors)}`,
    );
  }
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
  if (opts.repository && !names.includes(opts.repository)) {
    throw new Error("Requested repository is not in the allowlist");
  }

  if (opts.plan) {
    const matrix = {
      include: repositories
        .filter((r) => !opts.repository || r.name === opts.repository)
        .map((r) => {
          const branch = r.branch ?? config.defaults?.branch;
          if (!branch) throw new Error(`Missing branch for ${r.name}`);
          return { name: r.name, branch };
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

  if (!opts.repository || !opts.output) {
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
    repository: opts.repository,
    sourceRoot: resolve(opts.sourceRoot),
    output: resolve(opts.output),
    workflow: opts.workflow,
    existingFiles,
    destinationPublish:
      publishFile && existsSync(publishFile)
        ? readFileSync(publishFile, "utf8")
        : undefined,
  });
  process.stdout.write(
    `${JSON.stringify({ repository: opts.repository, files })}\n`,
  );
};
