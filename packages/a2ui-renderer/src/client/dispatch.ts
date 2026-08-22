/**
 * a2ui-renderer action bridge —— 交互动作回传。
 *
 * 与 dsh-valuz-genui 同模式：动作编码为 `<ui_action>` 文本，经会话的
 * `conversation.send` 入队为用户消息（model-visible ⟺ logged），agent
 * 下一轮按教学段规则识别。零自定义 RPC、零 dsh 内核改动。
 */

import type { ClientContext, SessionId } from "@deepseek-ai/dsh-client-runtime/client";

/** 一个 A2UI 用户交互（回传给 agent）。 */
export interface UiAction {
  surfaceId: string;
  /** 模型在 button.action / form.submitAction 中声明的动作名。 */
  name: string;
  /** 触发动作的组件 id。 */
  component: string;
  /** 动作上下文 / 表单字段值。 */
  context?: unknown;
}

const ATTRIBUTE_SAFE = /^[A-Za-z0-9_.:-]{1,128}$/;

function attribute(value: string): string {
  return ATTRIBUTE_SAFE.test(value) ? value : encodeURIComponent(value).slice(0, 128);
}

/** 渲染回传文本：`<ui_action surface="..." component="..." name="...">payload</ui_action>`。 */
export function formatUiAction(action: UiAction): string {
  const context = action.context === undefined ? "" : JSON.stringify(action.context);
  return `<ui_action surface="${attribute(action.surfaceId)}" component="${attribute(action.component)}" name="${attribute(action.name)}">${context}</ui_action>`;
}

/** 会话作用域内的 conversation 面（仅需 send）。 */
interface ConversationSend {
  send(text: string): Promise<void>;
}

/**
 * 构造一个会话的 action 发送器。
 * @param ctx - client 上下文（解析会话作用域）。
 * @param sessionId - 拥有该 surface 的会话。
 */
export function createActionSender(ctx: ClientContext, sessionId: SessionId): (action: UiAction) => void {
  return (action: UiAction) => {
    const scoped = ctx.sessions.scope(sessionId);
    const conversation = scoped?.get("conversation") as ConversationSend | undefined;
    if (conversation === undefined) {
      console.warn("[a2ui] no conversation service for session; UI action dropped");
      return;
    }
    void conversation.send(formatUiAction(action)).catch((error: unknown) => {
      console.warn("[a2ui] failed to send UI action", error instanceof Error ? error.message : error);
    });
  };
}
