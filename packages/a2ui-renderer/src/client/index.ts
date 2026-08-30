/**
 * a2ui-renderer —— client 半部。
 *
 * 注册 'a2ui' ConversationNodeDefinition（工具通道：tool-call-delta 流式 +
 * tool/result.meta 落定）与 'a2ui' keyed renderer（inject 函数注入
 * sendAction 与 colorScheme），UI 原位内嵌在对话中。
 */

import type { ClientContext, SessionId } from "@deepseek-ai/dsh-client-runtime/client";
// Type-only: 引入 ui-conversation 的 SlotMap/类型合并与 ui-theme 的 Context merge。
import type {} from "@deepseek-ai/dsh-client-ui-conversation/client";
import type {} from "@deepseek-ai/dsh-client-ui-theme/client";
import type {} from "@deepseek-ai/dsh-client-ui-settings/client";
import { injectA2uiStyles } from "./a2ui-css.ts";
import { createActionSender } from "./dispatch.ts";
import { A2uiNodeView, type A2uiNodeInjected } from "./components/A2uiNodeView.tsx";
import { registerDshBasicComponents } from "./components/dsh-basic.tsx";
import { registerA2uiConversationNode } from "./definition.ts";
import { A2uiComponentRegistry } from "./registry.ts";
import { assertA2uiClientCapabilities } from "./runtime.ts";
import { A2uiSettingsSection, type A2uiSettingsInjected } from "./settings/A2uiSettingsSection.tsx";
import { importA2uiCatalogDirectory } from "./settings/catalog-import.ts";

/** 依赖的 client 侧服务。 */
export const inject = ["conversationEvents", "slots", "sessions", "theme", "workspaces"];

/**
 * Client plugin body：注入全局样式、注册节点 Definition 与 keyed renderer。
 * 数据链路见 definition.ts（工具调用 → tool/result.meta，零自定义事件）。
 */
export function apply(ctx: ClientContext): void {
  assertA2uiClientCapabilities(ctx);
  const a2uiRenderer = new A2uiComponentRegistry();
  ctx.provide("a2uiRenderer", a2uiRenderer);
  ctx.effect(() => registerDshBasicComponents(a2uiRenderer), "a2ui renderer dsh-basic");
  injectA2uiStyles();
  registerA2uiConversationNode(ctx);
  ctx.slots.inject("conversation.chat.node", () => ctx.slots.register({
    name: "conversation.chat.node",
    key: "a2ui",
    inject: (sessionId: SessionId): A2uiNodeInjected => ({
      sendAction: createActionSender(ctx, sessionId),
      colorScheme: ctx.theme.getTheme().active.colorScheme,
      a2uiRenderer,
    }),
  }, A2uiNodeView));
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "a2ui",
    order: 18,
    label: () => "A2UI",
    inject: (): A2uiSettingsInjected => ({
      chooseDirectory: () => ctx.workspaces.pickDirectory(),
      importDirectory: importA2uiCatalogDirectory,
    }),
  }, A2uiSettingsSection));
}

export { A2uiComponentRegistry } from "./registry.ts";
export type { A2uiComponentRenderer, A2uiComponentRendererProps } from "./registry.ts";
