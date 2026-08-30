/** Downloadable requirements template for installable A2UI component libraries. */

/** JSON-safe manifest template accepted by the local component-library importer. */
export const A2UI_CATALOG_TEMPLATE = {
  name: "@dsh-plugin-edu/a2ui-catalog-your-library",
  version: "0.1.0",
  type: "module",
  dsh: {
    bundle: { patch: "./cordis.patch.yml" },
    client: { inject: ["@dsh-plugin-edu/a2ui-renderer"], platform: "web" },
  },
  a2ui: {
    catalog: { id: "your-catalog", components: ["your-component"] },
    host: "./lib/index.js",
    client: "./lib/client.js",
  },
  requirements: [
    "Host entry registers the catalog through registerA2uiCatalog().",
    "Client entry registers every renderer through ctx.a2uiRenderer.register().",
    "cordis.patch.yml inserts the host package as a loader row.",
    "Build lib/index.js and lib/client.js before importing the directory.",
  ],
} as const;

/** Trigger a browser download of the component-library requirements template. */
export function downloadA2uiCatalogTemplate(): void {
  const blob = new Blob([`${JSON.stringify(A2UI_CATALOG_TEMPLATE, undefined, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "a2ui-catalog-library.template.json";
  link.click();
  URL.revokeObjectURL(url);
}
