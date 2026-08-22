/**
 * a2ui-adapter tsdown 配置 —— 宿主侧插件（node 半部）。
 */

import type { UserConfig } from "tsdown";

export default {
  name: "@dsh-a2ui/a2ui-adapter",
  entry: ["src/index.ts"],
  outDir: "lib",
  format: ["esm"],
  platform: "node",
  target: "es2024",
  fixedExtension: false,
  dts: false,
  clean: true,
} satisfies UserConfig;
