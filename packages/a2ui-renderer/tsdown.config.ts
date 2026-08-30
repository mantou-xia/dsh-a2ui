/**
 * a2ui-renderer tsdown 配置（独立于 dsh 仓库的 tsdown.client preset）。
 *
 * 产出两半部：
 *   - lib/index.js：node 半部（宿主 loader import）；
 *   - lib/client.js：浏览器 client bundle（closure-factory 形态：
 *     window.__ModuleLoader__.load({ id, factory })；dsh 的 client-modules
 *     经 /plugins/<id>/client.js 下发后由浏览器加载器执行）。
 *
 * client bundle 的 externals 是 dsh 的 platform module 表 + runtime/client
 * 豁免（与 dsh 仓库 packages/client/tsdown.client.ts 的 CLIENT_EXTERNALS
 * 保持同源，取本包实际用到的子集）；其余依赖一律内联。
 */

import type { UserConfig } from "tsdown";

/** dsh platform modules（本包运行时会 import 的部分）+ runtime/client 豁免。 */
const CLIENT_EXTERNALS = [
  "react",
  "react/jsx-runtime",
  "react-dom",
  "react-dom/client",
  "@deepseek-ai/cordis",
  "@deepseek-ai/dsh-client-ui-slots",
  "@deepseek-ai/dsh-client-runtime/client",
] as const;

const nodeConfig: UserConfig = {
  name: "@dsh-a2ui/a2ui-renderer",
  entry: ["src/index.ts"],
  outDir: "lib",
  format: ["esm"],
  platform: "node",
  target: "es2024",
  fixedExtension: false,
  dts: true,
  clean: true,
};

const clientConfig: UserConfig = {
  name: "@dsh-a2ui/a2ui-renderer/client",
  entry: { client: "src/client/index.ts" },
  outDir: "lib",
  format: "cjs",
  platform: "browser",
  target: "es2024",
  sourcemap: true,
  dts: false,
  clean: false,
  deps: {
    neverBundle: [...CLIENT_EXTERNALS],
    // tsdown resolves these as distinct subpaths; bundle exactly the imports
    // registered by EchartsView instead of the full echarts.common build.
    alwaysBundle: ["echarts/core", "echarts/charts", "echarts/components", "echarts/renderers"],
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
    "import.meta.env.MODE": JSON.stringify(process.env.NODE_ENV ?? "production"),
    "import.meta.env": JSON.stringify({ MODE: process.env.NODE_ENV ?? "production" }),
  },
  outputOptions: {
    entryFileNames: "client.js",
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify("@dsh-a2ui/a2ui-renderer")}, factory: (require) => {`,
    footer: "return module.exports; } });",
    intro: "var module = { exports: {} }; var exports = module.exports;",
  },
};

/** Type-only public entry for custom browser component-library authors. */
const clientTypesConfig: UserConfig = {
  name: "@dsh-a2ui/a2ui-renderer/client-types",
  entry: { "client-types": "src/client/api.ts" },
  outDir: "lib",
  format: ["esm"],
  platform: "neutral",
  target: "es2024",
  dts: true,
  clean: false,
};

export default [nodeConfig, clientConfig, clientTypesConfig];
