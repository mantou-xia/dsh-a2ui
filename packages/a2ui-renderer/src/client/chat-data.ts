/**
 * a2ui-renderer chat-data —— Chat 业务节点数据模型与声明合并。
 *
 * MVP 语义（固定约定）：一个 createSurface 消息 = 一个完整可渲染的
 * Surface Snapshot；`surfaces` 按 surfaceId 整体替换（Map.set），
 * 不做组件级 patch（updateComponents 等消息收到即忽略）。
 */

import type { A2uiSurfaceSnapshot } from "@dsh-a2ui/a2ui-protocol";
import type {} from "@deepseek-ai/dsh-client-runtime/client";
import type {} from "@deepseek-ai/dsh-client-ui-conversation/client";

/** 一个 surface 的可渲染快照及其产生位置。 */
export interface A2uiSurfaceState {
  readonly surfaceId: string;
  readonly snapshot: A2uiSurfaceSnapshot;
  /** 产生该快照的会话事件 seq（回放排序用）。 */
  readonly seq: number;
}

/** 'a2ui' Chat 节点的最终载荷。 */
export interface A2uiChatData {
  /** surfaceId → 快照（整值替换，MVP 无增量）。 */
  readonly surfaces: ReadonlyMap<string, A2uiSurfaceState>;
}

declare module "@deepseek-ai/dsh-client-ui-conversation/client" {
  interface ChatNodeDataMap {
    /** A2UI surface 渲染节点。 */
    "a2ui": A2uiChatData;
  }
}

declare module "@deepseek-ai/dsh-client-runtime/client" {
  interface ConversationStepDataMap {
    /** A2UI surface 渲染节点（步骤级业务数据，供其他节点读取）。 */
    "a2ui": A2uiChatData;
  }
}
