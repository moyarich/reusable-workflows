import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["**/*.emulate.{ts,mjs}"] } });
