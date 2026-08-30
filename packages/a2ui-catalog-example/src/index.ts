/** Host half of the example hot-pluggable A2UI catalog library. */

import type { Context } from "@deepseek-ai/cordis";
import { registerA2uiCatalog } from "@dsh-a2ui/a2ui-adapter";
import { A2UI_EXAMPLE_REGISTRATION } from "./catalog.js";

/** Stable Cordis plugin name. */
export const name = "dsh-a2ui-catalog-example";

/** The adapter service owns protocol validation; systemPrompt receives library guidance. */
export const inject = ["a2uiCatalogs", "systemPrompt"];

/** Register the example catalog for this plugin fiber's lifetime. */
export function apply(ctx: Context): void {
  registerA2uiCatalog(ctx, A2UI_EXAMPLE_REGISTRATION);
}

export { A2UI_EXAMPLE_CATALOG, A2UI_EXAMPLE_CATALOG_ID, A2UI_EXAMPLE_REGISTRATION, A2UI_EXAMPLE_TEACHING } from "./catalog.js";
