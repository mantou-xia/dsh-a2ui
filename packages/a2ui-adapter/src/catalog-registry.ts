/** A2UI host catalog service and effect-scoped catalog-library registration. */

import type { Context } from "@deepseek-ai/cordis";
import {
  A2uiCatalogRegistry,
  DSH_BASIC_CATALOG,
  DSH_BASIC_CATALOG_ID,
} from "@dsh-a2ui/a2ui-protocol";
import type { A2uiCatalogRegistration } from "@dsh-a2ui/a2ui-protocol";

declare module "@deepseek-ai/cordis" {
  interface Context {
    /** Active host-side A2UI catalogs used by the tool guard. */
    a2uiCatalogs: A2uiCatalogRegistry;
  }
}

/** Install the catalog service and its built-in dsh-basic library. */
export function provideA2uiCatalogs(ctx: Context): A2uiCatalogRegistry {
  const catalogs = new A2uiCatalogRegistry(DSH_BASIC_CATALOG_ID);
  ctx.provide("a2uiCatalogs", catalogs);
  ctx.effect(() => catalogs.register({ catalog: DSH_BASIC_CATALOG }), "a2ui catalog dsh-basic");
  return catalogs;
}

/**
 * Register an external catalog library for the lifetime of its Cordis plugin.
 * @param ctx - host context with the adapter catalog service.
 * @param registration - protocol whitelist and optional model authoring guidance.
 * @param teachingOrder - system-prompt position for library-specific guidance.
 */
export function registerA2uiCatalog(
  ctx: Context,
  registration: A2uiCatalogRegistration,
  teachingOrder = 131,
): void {
  const catalogId = registration.catalog.catalogId;
  ctx.effect(() => {
    const disposeCatalog = ctx.a2uiCatalogs.register(registration);
    const disposeTeaching = registration.teaching === undefined
      ? undefined
      : ctx.systemPrompt.section({
        name: `a2ui.catalog.${catalogId}`,
        order: teachingOrder,
        text: registration.teaching,
      });
    return () => {
      disposeTeaching?.();
      disposeCatalog();
    };
  }, `a2ui catalog ${catalogId}`);
}
