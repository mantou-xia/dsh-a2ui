/** Build the public A2UI protocol package for plain Node ESM consumers. */

import type { UserConfig } from "tsdown";

export default {
  name: "@dsh-plugin-edu/a2ui-protocol",
  entry: ["src/index.ts"],
  outDir: "lib",
  format: ["esm"],
  platform: "neutral",
  target: "es2024",
  fixedExtension: false,
  dts: true,
  clean: true,
} satisfies UserConfig;
