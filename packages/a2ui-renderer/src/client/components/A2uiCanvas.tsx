/** Shared visual frame and layout root for one rendered A2UI surface. */

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { getA2uiSkin, subscribeA2uiSkin } from "../skins.ts";

/** Props for the surface-level A2UI canvas. */
export type A2uiCanvasProps = {
  /** Stable surface identifier, exposed for diagnostics and tests. */
  readonly surfaceId: string;
  /** Rendered root component tree for this surface. */
  readonly children: ReactNode;
};

/**
 * Render the common canvas around every A2UI component tree.
 * @param props - surface identity and its rendered component tree.
 * @returns framed responsive canvas for one surface.
 */
export function A2uiCanvas({ surfaceId, children }: A2uiCanvasProps): ReactNode {
  const skin = useSyncExternalStore(subscribeA2uiSkin, getA2uiSkin, getA2uiSkin);
  return (
    <section className="a2ui-surface a2ui-canvas" data-a2ui-canvas={surfaceId} data-a2ui-skin={skin} aria-label={`A2UI 面板 ${surfaceId}`}>
      <div className="a2ui-canvas-content">{children}</div>
    </section>
  );
}
