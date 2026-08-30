import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectA2uiCatalogLibrary } from "./catalog-importer.js";

const directories: string[] = [];

function library(manifest: Record<string, unknown>): string {
  const directory = mkdtempSync(join(tmpdir(), "dsh-a2ui-library-"));
  directories.push(directory);
  mkdirSync(join(directory, "lib"));
  writeFileSync(join(directory, "cordis.patch.yml"), "[]\n");
  writeFileSync(join(directory, "lib", "index.js"), "export {};\n");
  writeFileSync(join(directory, "lib", "client.js"), "export {};\n");
  writeFileSync(join(directory, "package.json"), JSON.stringify(manifest));
  return directory;
}

function manifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "@dsh-a2ui/forecast",
    dsh: { bundle: { patch: "./cordis.patch.yml" }, client: { platform: "web" } },
    a2ui: { catalog: { id: "forecast", components: ["weather-card"] }, host: "./lib/index.js", client: "./lib/client.js" },
    ...overrides,
  };
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("A2UI local catalog importer", () => {
  it("accepts a built library with host, client, bundle, and catalog declarations", () => {
    const inspected = inspectA2uiCatalogLibrary(library(manifest()));
    expect(inspected.packageName).toBe("@dsh-a2ui/forecast");
    expect(inspected.metadata.catalog).toEqual({ id: "forecast", components: ["weather-card"] });
  });

  it("rejects a package that omits browser registration metadata", () => {
    expect(() => inspectA2uiCatalogLibrary(library(manifest({ dsh: { bundle: { patch: "./cordis.patch.yml" } } })))).toThrow("dsh.client.platform");
  });

  it("rejects duplicate or empty catalog component declarations", () => {
    expect(() => inspectA2uiCatalogLibrary(library(manifest({ a2ui: { catalog: { id: "forecast", components: ["weather-card", "weather-card"] }, host: "./lib/index.js", client: "./lib/client.js" } })))).toThrow("不能重复");
  });
});
