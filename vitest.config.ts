import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  resolve: {
    alias: [
      { find: "@dsh-a2ui/a2ui-renderer/client", replacement: path.join(here, "packages/a2ui-renderer/src/client/api.ts") },
      { find: "@dsh-a2ui/a2ui-protocol", replacement: path.join(here, "packages/a2ui-protocol/src/index.ts") },
      { find: "@dsh-a2ui/a2ui-adapter", replacement: path.join(here, "packages/a2ui-adapter/src/index.ts") },
      { find: "@dsh-a2ui/a2ui-renderer", replacement: path.join(here, "packages/a2ui-renderer/src/index.ts") },
    ],
  },
  test: {
    include: ["packages/**/src/**/*.test.ts", "packages/**/src/**/*.test.tsx"],
    environment: "node",
  },
});
