import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.vite/**",
      "**/.output/**",
      "**/build/**",
      "apps/playground/**",
    ],
  },
  {
    files: [
      "src/**/*.{js,mjs,ts}",
      "packages/**/*.{js,mjs,ts}",
      "tests/**/*.{js,mjs,ts}",
      "vite.config.ts",
    ],
    ...js.configs.recommended,
    rules: {
      ...js.configs.recommended.rules,
      "no-undef": "off",
    },
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: [
      "src/**/*.ts",
      "packages/**/*.ts",
      "tests/**/*.ts",
      "vite.config.ts",
    ],
  })),
);
