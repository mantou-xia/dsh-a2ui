import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const [version, mode] = process.argv.slice(2);

if (!/^0\.1\.\d+-rc\.\d+$/.test(version ?? "")) {
  throw new Error("Usage: node scripts/select-dsh-version.mjs <0.1.x-rc.y> [--verify]");
}

const targets = [
  {
    file: "packages/a2ui-adapter/package.json",
    dependencies: ["@deepseek-ai/dsh-session", "@deepseek-ai/dsh-tools"],
  },
  {
    file: "packages/a2ui-renderer/package.json",
    dependencies: [
      "@deepseek-ai/dsh-client-runtime",
      "@deepseek-ai/dsh-client-ui-conversation",
      "@deepseek-ai/dsh-client-ui-slots",
      "@deepseek-ai/dsh-client-ui-theme",
    ],
  },
];

for (const target of targets) {
  const path = resolve(root, target.file);
  const manifest = JSON.parse(await readFile(path, "utf8"));
  const dependencies = manifest.devDependencies ?? {};
  for (const name of target.dependencies) {
    if (dependencies[name] === undefined) {
      throw new Error(`${target.file} is missing devDependency ${name}`);
    }
    if (mode === "--verify") {
      if (dependencies[name] !== version) {
        throw new Error(`${target.file} has ${name}@${dependencies[name]}, expected ${version}`);
      }
    } else {
      dependencies[name] = version;
    }
  }
  if (mode !== "--verify") {
    await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }
}

console.log(`${mode === "--verify" ? "Verified" : "Selected"} DSH package family ${version}`);
