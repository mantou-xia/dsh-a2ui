/** Browser half of the example hot-pluggable A2UI catalog library. */

import type { ClientContext } from "@deepseek-ai/dsh-client-runtime/client";
import type { A2uiComponentRendererProps } from "@dsh-a2ui/a2ui-renderer/client";
import { A2UI_EXAMPLE_CATALOG_ID } from "./catalog.js";

/** The renderer registry must be available before this browser half activates. */
export const inject = ["a2uiRenderer"];

function text(component: A2uiComponentRendererProps["component"], key: string): string {
  const value = component[key];
  return typeof value === "string" ? value : "";
}

/** Render the catalog's notice component without changing the core renderer. */
export function ExampleNoticeView({ component }: A2uiComponentRendererProps) {
  const tone = text(component, "tone");
  const color = tone === "error" ? "#b42318" : tone === "warn" ? "#b54708" : tone === "success" ? "#027a48" : "#175cd3";
  return <section style={{ borderLeft: `3px solid ${color}`, padding: "8px 12px" }} aria-label={text(component, "title") || "通知"}>
    {text(component, "title") && <strong>{text(component, "title")}</strong>}
    <div>{text(component, "body")}</div>
  </section>;
}

/** Register the browser renderer for the current plugin fiber. */
export function apply(ctx: ClientContext): void {
  ctx.effect(
    () => ctx.a2uiRenderer.register(A2UI_EXAMPLE_CATALOG_ID, "notice", ExampleNoticeView),
    "a2ui example notice renderer",
  );
}
