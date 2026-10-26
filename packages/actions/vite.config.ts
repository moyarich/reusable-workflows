import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { githubActions } from "@moyarich/vite-github-actions";

// Source files live under packages/*; root actions/ is generated output.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("../cli/src", import.meta.url)) },
  },
  plugins: [
    githubActions({
      root: "../..",
      build: {
        input: [
          {
            from: "packages/cli/src/*/action-entry.ts",
            to: "actions/{parent}/index.mjs",
          },
        ],
      },
      copy: [
        { from: "packages/actions/actions/**/*", to: "actions/" },
        {
          from: "packages/cli/src/schemas/check-dist-config.schema.json",
          to: "actions/check-dist/check-dist-config.schema.json",
        },
        {
          from: "packages/cli/src/schemas/copy-config.schema.json",
          to: "actions/copy-files-to-another-repository/config.schema.json",
        },
        {
          from: "packages/cli/src/schemas/check-dist-config.schema.json",
          to: "actions/schemas/check-dist-config.schema.json",
        },
        {
          from: "packages/cli/src/schemas/copy-config.schema.json",
          to: "actions/schemas/copy-config.schema.json",
        },
      ],
    }),
  ],
});
