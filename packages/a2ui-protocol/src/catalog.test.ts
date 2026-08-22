import { describe, expect, it } from "vitest";
import {
  DSH_BASIC_CATALOG,
  DSH_BASIC_CATALOG_ID,
  getCatalogComponent,
  isCatalogComponent,
  resolveCatalog,
} from "./index.js";

describe("a2ui-protocol: catalog", () => {
  it("declares the static 6 + interactive 4 component subset", () => {
    expect(DSH_BASIC_CATALOG.components.map((d) => d.component)).toEqual([
      "stat",
      "table",
      "chart",
      "card",
      "grid",
      "callout",
      "button",
      "form",
      "input",
      "select",
    ]);
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
    expect(table?.properties.map((p) => p.name)).toEqual(["title", "columns", "rows"]);
  });

  it("resolveCatalog defaults to dsh-basic and rejects unknown catalogs", () => {
    expect(resolveCatalog(undefined)?.catalogId).toBe(DSH_BASIC_CATALOG_ID);
    expect(resolveCatalog(DSH_BASIC_CATALOG_ID)?.catalogId).toBe(DSH_BASIC_CATALOG_ID);
    expect(resolveCatalog("official-basic")).toBeUndefined();
  });
});
