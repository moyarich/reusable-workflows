import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "tests/**/*.{test,spec}.{ts,tsx,js,mjs}",
      "packages/*/tests/**/*.{test,spec}.{ts,tsx,js,mjs}",
    ],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
