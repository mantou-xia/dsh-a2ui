/** Same-origin client for the adapter-owned trusted local catalog installer. */

/** Installation result returned by the A2UI Host endpoint. */
export type A2uiCatalogImportResult = { readonly packageName: string; readonly catalogId: string; readonly restartRequired: true };

/** Ask the running DSH Host to inspect and install one trusted local library directory. */
export async function importA2uiCatalogDirectory(path: string): Promise<A2uiCatalogImportResult> {
  const response = await fetch("/api/a2ui/catalogs/import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path }),
  });
  const payload = await response.json() as A2uiCatalogImportResult | { error?: unknown };
  if (!response.ok || !("packageName" in payload)) {
    const failure = payload as { error?: unknown };
    throw new Error(typeof failure.error === "string" ? failure.error : "组件库安装失败。");
  }
  return payload;
}
