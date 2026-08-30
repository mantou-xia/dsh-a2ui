/**
 * A2UI catalog registry.
 *
 * A catalog library contributes its protocol whitelist through this registry.
 * Registrations are reversible so a Cordis plugin may be unloaded without
 * leaving an accepted catalog behind.
 */

import type { A2uiCatalog } from "./types.js";

/** One catalog library contribution. */
export type A2uiCatalogRegistration = {
  /** The protocol catalog used by the guard. */
  readonly catalog: A2uiCatalog;
  /** Optional model-facing authoring guidance owned by this library. */
  readonly teaching?: string;
};

/** Mutable catalog lookup owned by one host composition. */
export class A2uiCatalogRegistry {
  private readonly registrations = new Map<string, A2uiCatalogRegistration>();

  /**
   * Create a registry with the catalog used when createSurface omits catalogId.
   * @param defaultCatalogId - catalog selected for omitted catalogId values.
   */
  constructor(readonly defaultCatalogId: string) {
    if (defaultCatalogId.length === 0 || defaultCatalogId.trim() !== defaultCatalogId) {
      throw new Error("a2ui catalogs: defaultCatalogId must be a non-blank trimmed string");
    }
  }

  /**
   * Add one catalog library.
   * @param registration - catalog and optional authoring guidance.
   * @returns disposer that removes this exact registration.
   */
  register(registration: A2uiCatalogRegistration): () => void {
    const { catalog } = registration;
    if (catalog.catalogId.length === 0 || catalog.catalogId.trim() !== catalog.catalogId) {
      throw new Error("a2ui catalogs: catalogId must be a non-blank trimmed string");
    }
    if (catalog.components.length === 0) {
      throw new Error(`a2ui catalogs: catalog '${catalog.catalogId}' must declare at least one component`);
    }
    if (this.registrations.has(catalog.catalogId)) {
      throw new Error(`a2ui catalogs: catalog '${catalog.catalogId}' is already registered`);
    }
    this.registrations.set(catalog.catalogId, registration);
    return () => {
      if (this.registrations.get(catalog.catalogId) === registration) {
        this.registrations.delete(catalog.catalogId);
      }
    };
  }

  /**
   * Resolve a requested catalog, applying the composition default when omitted.
   * @param catalogId - createSurface catalogId, if supplied.
   * @returns registered catalog, or undefined when the library is absent.
   */
  resolve(catalogId: string | undefined): A2uiCatalog | undefined {
    return this.registrations.get(catalogId ?? this.defaultCatalogId)?.catalog;
  }

  /** Return active catalog-library contributions in registration order. */
  entries(): readonly A2uiCatalogRegistration[] {
    return [...this.registrations.values()];
  }

  /** Return active catalog identifiers in registration order. */
  catalogIds(): readonly string[] {
    return [...this.registrations.keys()];
  }
}
