/** A2UI browser component registry. */

import type { ComponentType, ReactNode } from "react";
import type { A2uiComponent } from "@dsh-plugin-edu/a2ui-protocol";

/** Props shared by every catalog-provided React component. */
export type A2uiComponentRendererProps = {
  readonly component: A2uiComponent;
  readonly children: ReactNode;
  readonly childComponents: readonly A2uiComponent[];
  readonly colorScheme: "light" | "dark";
  readonly emit: (action: { name: string; payload?: unknown }) => void;
};

/** React implementation for one catalog component. */
export type A2uiComponentRenderer = ComponentType<A2uiComponentRendererProps>;

declare module "@deepseek-ai/cordis" {
  interface Context {
    /** Active browser-side A2UI component renderers. */
    a2uiRenderer: A2uiComponentRegistry;
  }
}

/** Registry with synchronous change notifications for hot component libraries. */
export class A2uiComponentRegistry {
  private readonly renderers = new Map<string, A2uiComponentRenderer>();
  private readonly listeners = new Set<() => void>();
  private revision = 0;

  /**
   * Add one React renderer.
   * @param catalogId - catalog that owns the component name.
   * @param component - catalog component name.
   * @param renderer - React component implementation.
   * @returns disposer that removes this exact registration.
   */
  register(catalogId: string, component: string, renderer: A2uiComponentRenderer): () => void {
    if (catalogId.length === 0 || catalogId.trim() !== catalogId) {
      throw new Error("a2ui renderer: catalogId must be a non-blank trimmed string");
    }
    if (component.length === 0 || component.trim() !== component) {
      throw new Error("a2ui renderer: component must be a non-blank trimmed string");
    }
    const key = `${catalogId}\u0000${component}`;
    if (this.renderers.has(key)) {
      throw new Error(`a2ui renderer: '${catalogId}/${component}' is already registered`);
    }
    this.renderers.set(key, renderer);
    this.changed();
    return () => {
      if (this.renderers.get(key) === renderer) {
        this.renderers.delete(key);
        this.changed();
      }
    };
  }

  /** Look up a renderer for the surface catalog and component name. */
  resolve(catalogId: string, component: string): A2uiComponentRenderer | undefined {
    return this.renderers.get(`${catalogId}\u0000${component}`);
  }

  /** Subscribe to additions and removals. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /** Current mutation version for useSyncExternalStore. */
  getVersion(): number {
    return this.revision;
  }

  private changed(): void {
    this.revision += 1;
    for (const listener of Array.from(this.listeners)) listener();
  }
}
