/**
 * a2ui-renderer definition —— 'a2ui' ConversationNodeDefinition（tool 通道）。
 *
 * 模型通过 `a2ui_render` 工具输出 A2UI：assistant 流中的 tool-call-delta
 * （块 name === 'a2ui_render'）流式累积参数，工具落定后读
 * `tool/result.meta`（kind === 'a2ui-surface'，durable）拿权威 document。
 * 节点 anchorSeq = 工具调用事件的 seq → **UI 原位内嵌在对话中**；
 * replay 从 tool/result.meta 恢复（无流式 chunk 时以事件 seq 为锚）。
 *
 * 不再解析 assistant 文本中的 `[a2ui]` 短代码：工具调用不会被
 * AssistantMarkdown 渲染成可见文本，原始 JSON 不会泄露。
 */

import type { Context } from "@deepseek-ai/cordis";
import type {
  ChatConversationViewNode,
  ConversationLocation,
  ConversationMatch,
  ConversationMatchResult,
  ConversationNodeContext,
  ConversationNodeDefinition,
  ConversationPublication,
} from "@deepseek-ai/dsh-client-runtime/client";
import {
  DSH_BASIC_CATALOG_ID,
  isA2uiEnvelope,
  readCreateSurface,
} from "@dsh-a2ui/a2ui-protocol";
import type { A2uiSurfaceSnapshot } from "@dsh-a2ui/a2ui-protocol";
import type { A2uiChatData, A2uiSurfaceState } from "./chat-data.ts";

export const A2UI_TOOL_NAME = "a2ui_render" as const;
export const A2UI_META_KIND = "a2ui-surface" as const;

interface A2uiDefinitionState {
  /** 本 step 中 a2ui_render 工具调用块 index（一旦见到）。 */
  renderIndex: number | null;
  /** 工具调用 id（= surfaceId）。 */
  surfaceId: string | null;
  /** 流式累积的工具参数。 */
  argsRaw: string;
  /** 落定后的权威 surface（工具结果）。 */
  settled: A2uiSurfaceState | null;
  /** 渲染锚点：工具调用事件的 seq（流中位置）。 */
  anchorSeq: number | null;
  location: ConversationLocation | null;
}

function initial(): A2uiDefinitionState {
  return { renderIndex: null, surfaceId: null, argsRaw: "", settled: null, anchorSeq: null, location: null };
}

/** tool/result.meta 判别。 */
export function isA2uiSurfaceMeta(value: unknown): value is {
  kind: typeof A2UI_META_KIND;
  surfaceId: string;
  document: string;
  title?: string;
  componentNames: string[];
  warningCount: number;
} {
  if (typeof value !== "object" || value === null) return false;
  const meta = value as Record<string, unknown>;
  return meta["kind"] === A2UI_META_KIND
    && typeof meta["surfaceId"] === "string"
    && typeof meta["document"] === "string";
}

/** 解析 JSONL document（每行一个 A2UI envelope）为 surface 快照（取第一个 createSurface）。 */
export function snapshotFromDocument(document: string): A2uiSurfaceSnapshot | null {
  for (const line of document.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    let envelope: unknown;
    try {
      envelope = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (!isA2uiEnvelope(envelope)) continue;
    const createSurface = readCreateSurface(envelope);
    if (createSurface === null) continue;
    return {
      surfaceId: createSurface.surfaceId,
      catalogId: createSurface.catalogId ?? DSH_BASIC_CATALOG_ID,
      ...(createSurface.theme !== undefined ? { theme: createSurface.theme } : {}),
      ...(createSurface.sendDataModel !== undefined ? { sendDataModel: createSurface.sendDataModel } : {}),
      components: createSurface.components ?? [],
    };
  }
  return null;
}

function foldMatch(state: A2uiDefinitionState, match: ConversationMatch): A2uiDefinitionState {
  const event = match.event;
  if (event.type === "assistant/chunk") {
    const chunk = event.data.chunk;
    if (chunk.type !== "tool-call-delta") return state;
    let { renderIndex, surfaceId, anchorSeq, location } = state;
    if (chunk.name === A2UI_TOOL_NAME) {
      renderIndex = chunk.index;
      surfaceId = String(chunk.id);
      // 锚定在工具调用事件（不是 step/start——那会排到顶部）。
      if (anchorSeq === null) {
        anchorSeq = event.seq;
        location = match.location;
      }
    }
    if (renderIndex !== null && chunk.index === renderIndex) {
      return { ...state, renderIndex, surfaceId, anchorSeq, location, argsRaw: state.argsRaw + chunk.argumentsDelta };
    }
    return { ...state, renderIndex, surfaceId, anchorSeq, location };
  }
  if (event.type === "tool/result" && isA2uiSurfaceMeta(event.data.meta)) {
    const meta = event.data.meta;
    const snapshot = snapshotFromDocument(meta.document);
    if (snapshot === null) return state;
    return {
      ...state,
      // 回放（无流式 chunk）时以 tool/result 事件为锚。
      anchorSeq: state.anchorSeq ?? event.seq,
      location: state.location ?? match.location,
      settled: { surfaceId: meta.surfaceId, snapshot, seq: event.seq },
    };
  }
  return state;
}

function publication(match: ConversationMatch): ConversationPublication {
  return match.event.type === "assistant/chunk" ? "animation-frame" : "immediate";
}

function buildViewNode(context: ConversationNodeContext<A2uiDefinitionState>): ChatConversationViewNode | null {
  const settled = context.state?.settled ?? null;
  if (settled === null) return null;
  const surfaces = new Map<string, A2uiSurfaceState>([[settled.surfaceId, settled]]);
  const data: A2uiChatData = { surfaces };
  return {
    key: context.key,
    kind: "a2ui",
    id: context.id,
    target: "chat",
    anchorSeq: context.state?.anchorSeq ?? context.start?.event.seq ?? 0,
    location: context.state?.location ?? context.start?.location ?? { kind: "unresolved" },
    visibility: "visible",
    data,
  };
}

/** 'a2ui' Chat 业务节点 Definition（工具通道）。 */
export const a2uiDefinition: ConversationNodeDefinition<A2uiDefinitionState> = {
  kind: "a2ui",
  target: "chat",
  match: (event): ConversationMatchResult | null => {
    if (event.type === "step/start") {
      return { id: `${event.data.turn}:${event.data.step}`, role: "start" };
    }
    if (event.type === "assistant/chunk" || event.type === "tool/result") {
      return { id: `${event.data.turn}:${event.data.step}`, role: "update" };
    }
    return null;
  },
  start: (_context, match) => {
    if (match.event.type !== "step/start") throw new Error("a2ui start requires step/start");
    return initial();
  },
  update: (context, match) => foldMatch(context.state, match),
  publication,
  buildViewNode,
};

/** 注册 'a2ui' Definition。 */
export function registerA2uiConversationNode(ctx: Context): void {
  ctx.conversationEvents.register(a2uiDefinition);
}
