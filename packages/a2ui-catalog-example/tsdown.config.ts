import type { UserConfig } from "tsdown";

const nodeConfig: UserConfig = {
  name: "@dsh-plugin-edu/a2ui-catalog-example",
  entry: ["src/index.ts"],
  outDir: "lib",
  format: ["esm"],
  platform: "node",
  target: "es2024",
  fixedExtension: false,
  dts: false,
  clean: true,
};

const clientConfig: UserConfig = {
  name: "@dsh-plugin-edu/a2ui-catalog-example/client",
  entry: { client: "src/client.tsx" },
  outDir: "lib",
  format: "cjs",
  platform: "browser",
  target: "es2024",
  dts: false,
  clean: false,
  deps: {
    neverBundle: ["react", "react/jsx-runtime", "@deepseek-ai/cordis", "@deepseek-ai/dsh-client-runtime/client"],
  },
  outputOptions: {
    entryFileNames: "client.js",
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify("@dsh-plugin-edu/a2ui-catalog-example")}, factory: (require) => {`,
    footer: "return module.exports; } });",
    intro: "var module = { exports: {} }; var exports = module.exports;",
  },
};

export default [nodeConfig, clientConfig];
