import { describe, expect, it } from "vitest";
import { A2uiCatalogRegistry, DSH_BASIC_CATALOG_ID, repairA2uiDocument } from "@dsh-plugin-edu/a2ui-protocol";
import { A2UI_EXAMPLE_CATALOG, A2UI_EXAMPLE_CATALOG_ID } from "./catalog.js";

describe("a2ui-catalog-example", () => {
  it("becomes valid only while its catalog registration is live", () => {
    const registry = new A2uiCatalogRegistry(DSH_BASIC_CATALOG_ID);
    const dispose = registry.register({ catalog: A2UI_EXAMPLE_CATALOG });
    const document = [{
      version: "v0.9.1",
      createSurface: {
        surfaceId: "example-1",
        catalogId: A2UI_EXAMPLE_CATALOG_ID,
        components: [{ id: "root", component: "notice", title: "Ready", body: "The library is active." }],
      },
    }];
    expect(repairA2uiDocument(document, registry)).not.toBeNull();
    dispose();
    expect(repairA2uiDocument(document, registry)).toBeNull();
  });
});
