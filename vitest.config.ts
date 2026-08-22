import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  test: {
    include: ["packages/**/src/**/*.test.ts", "packages/**/src/**/*.test.tsx"],
    environment: "node",
  },
});
