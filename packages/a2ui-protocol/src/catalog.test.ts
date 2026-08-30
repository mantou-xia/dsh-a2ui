import { describe, expect, it } from "vitest";
import {
  DSH_BASIC_CATALOG,
  DSH_BASIC_CATALOG_ID,
  A2uiCatalogRegistry,
  createDshBasicCatalogRegistry,
  getCatalogComponent,
  isCatalogComponent,
  resolveCatalog,
} from "./index.js";

describe("a2ui-protocol: catalog", () => {
  it("declares the built-in component library", () => {
    expect(DSH_BASIC_CATALOG.components.map((d) => d.component)).toEqual(expect.arrayContaining([
      "stat", "table", "chart", "card", "grid", "callout", "button", "form", "input", "select",
      "datetime", "switch", "slider", "tabs", "modal", "file",
    ]));
  });

  it("isCatalogComponent rejects unknown components", () => {
    expect(isCatalogComponent(DSH_BASIC_CATALOG, "stat")).toBe(true);
    expect(isCatalogComponent(DSH_BASIC_CATALOG, "button")).toBe(true);
    expect(isCatalogComponent(DSH_BASIC_CATALOG, "password")).toBe(false);
  });

  it("getCatalogComponent returns the def with whitelist and limits", () => {
    const table = getCatalogComponent(DSH_BASIC_CATALOG, "table");
    expect(table?.limits.maxTableRows).toBe(50);
    expect(table?.limits.maxTableCols).toBe(12);
    expect(table?.properties.map((p) => p.name)).toEqual(["title", "columns", "rows", "pageSize"]);
  });

  it("resolveCatalog defaults to dsh-basic and rejects unknown catalogs", () => {
    expect(resolveCatalog(undefined)?.catalogId).toBe(DSH_BASIC_CATALOG_ID);
    expect(resolveCatalog(DSH_BASIC_CATALOG_ID)?.catalogId).toBe(DSH_BASIC_CATALOG_ID);
    expect(resolveCatalog("official-basic")).toBeUndefined();
  });

  it("registers and unregisters catalog libraries without replacing a live owner", () => {
    const registry = new A2uiCatalogRegistry(DSH_BASIC_CATALOG_ID);
    const basic = registry.register({ catalog: DSH_BASIC_CATALOG });
    const custom = { catalogId: "example", components: [{ component: "notice", properties: [], limits: { maxStringLength: 100 } }] };
    const dispose = registry.register({ catalog: custom, teaching: "Use notice." });
    expect(registry.resolve("example")).toBe(custom);
    expect(registry.entries()).toHaveLength(2);
    expect(() => registry.register({ catalog: custom })).toThrow("already registered");
    dispose();
    expect(registry.resolve("example")).toBeUndefined();
    basic();
  });

  it("creates an isolated built-in registry for each host composition", () => {
    const registry = createDshBasicCatalogRegistry();
    expect(registry.resolve(undefined)).toBe(DSH_BASIC_CATALOG);
  });
});
