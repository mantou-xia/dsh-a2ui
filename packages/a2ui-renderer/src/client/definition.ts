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
  isA2uiEnvelope,
  repairA2uiDocument,
  reduceA2uiDocument,
  reduceA2uiEnvelope,
} from "@dsh-a2ui/a2ui-protocol";
import type { A2uiEnvelope, A2uiSurfaceMap, A2uiSurfaceSnapshot } from "@dsh-a2ui/a2ui-protocol";
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
  settled: ReadonlyMap<string, A2uiSurfaceState> | null;
  preview: ReadonlyMap<string, A2uiSurfaceState> | null;
  /** 已归约的完整流式 envelope，避免每个 chunk 重放历史 document。 */
  previewCache: A2uiArgumentPreviewCache | null;
  /** 渲染锚点：工具调用事件的 seq（流中位置）。 */
  anchorSeq: number | null;
  location: ConversationLocation | null;
}

function initial(): A2uiDefinitionState {
  return { renderIndex: null, surfaceId: null, argsRaw: "", settled: null, preview: null, previewCache: null, anchorSeq: null, location: null };
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
export function snapshotsFromDocument(document: string): ReadonlyMap<string, A2uiSurfaceSnapshot> {
  const messages = [];
  for (const line of document.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    let envelope: unknown;
    try {
      envelope = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (isA2uiEnvelope(envelope)) messages.push(envelope);
  }
  return reduceA2uiDocument(messages);
}

/** Returns each complete object already present in a streaming `messages` array. */
function completeMessageObjects(argsRaw: string): unknown[] {
  const key = argsRaw.search(/"messages"\s*:\s*\[/);
  if (key === -1) return [];
  const arrayStart = argsRaw.indexOf("[", key);
  if (arrayStart === -1) return [];
  const messages: unknown[] = [];
  let cursor = arrayStart + 1;
  while (cursor < argsRaw.length) {
    while (cursor < argsRaw.length && /[\s,]/.test(argsRaw[cursor] ?? "")) cursor++;
    if (argsRaw[cursor] !== "{") break;
    let depth = 0;
    let quoted = false;
    let escaped = false;
    let end = -1;
    for (let index = cursor; index < argsRaw.length; index++) {
      const char = argsRaw[index] ?? "";
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') quoted = false;
        continue;
      }
      if (char === '"') {
        quoted = true;
      } else if (char === "{") {
        depth++;
      } else if (char === "}") {
        depth--;
        if (depth === 0) {
          end = index + 1;
          break;
        }
      }
    }
    if (end === -1) break;
    try {
      messages.push(JSON.parse(argsRaw.slice(cursor, end)));
    } catch {
      break;
    }
    cursor = end;
  }
  return messages;
}

/**
 * Decodes a complete document when possible, otherwise previews only the
 * complete envelopes already emitted in a tool-call delta. Both paths pass
 * through the protocol guard before the renderer receives a snapshot.
 */
export function snapshotsFromArguments(argsRaw: string): ReadonlyMap<string, A2uiSurfaceSnapshot> {
  let messages: unknown[] = completeMessageObjects(argsRaw);
  try {
    const parsed: unknown = JSON.parse(argsRaw);
    if (typeof parsed === "object" && parsed !== null && Array.isArray((parsed as Record<string, unknown>).messages)) {
      messages = (parsed as { messages: unknown[] }).messages;
    }
  } catch {
    // A streaming arguments payload is normally incomplete; use the objects recovered above.
  }
  const repaired = repairA2uiDocument(messages);
  return repaired === null ? new Map() : reduceA2uiDocument(repaired);
}

/** 已通过 guard 的流式消息与归约结果；只在完整 envelope 增加时更新。 */
export interface A2uiArgumentPreviewCache {
  readonly completeMessageCount: number;
  readonly acceptedMessageCount: number;
  readonly snapshots: ReadonlyMap<string, A2uiSurfaceSnapshot>;
}

/**
 * 以追加式 arguments 更新 preview cache。guard 仍校验完整 document，但已验证
 * 的 surface 只应用新增 envelope，不在每个 chunk 重放所有历史生命周期消息。
 */
export function updateArgumentPreviewCache(
  previous: A2uiArgumentPreviewCache | null,
  argsRaw: string,
): A2uiArgumentPreviewCache | null {
  const messages = completeMessageObjects(argsRaw);
  if (previous !== null && messages.length === previous.completeMessageCount) return previous;
  if (previous !== null && messages.length < previous.completeMessageCount) return null;
  const repaired = repairA2uiDocument(messages);
  if (repaired === null) return previous;
  const startingIndex = previous?.acceptedMessageCount ?? 0;
  if (startingIndex > repaired.length) return null;
  const snapshots: A2uiSurfaceMap = new Map(previous?.snapshots);
  for (const message of repaired.slice(startingIndex) as A2uiEnvelope[]) {
    reduceA2uiEnvelope(snapshots, message);
  }
  return {
    completeMessageCount: messages.length,
    acceptedMessageCount: repaired.length,
    snapshots,
  };
}

function previewFromArguments(
  argsRaw: string,
  seq: number,
  previous: A2uiArgumentPreviewCache | null,
): { cache: A2uiArgumentPreviewCache | null; surfaces: ReadonlyMap<string, A2uiSurfaceState> | null; changed: boolean } {
  const cache = updateArgumentPreviewCache(previous, argsRaw);
  if (cache === null || cache.snapshots.size === 0) return { cache, surfaces: null, changed: cache !== previous };
  if (cache === previous) return { cache, surfaces: null, changed: false };
  return {
    cache,
    surfaces: new Map([...cache.snapshots.values()].map((snapshot) => [snapshot.surfaceId, { surfaceId: snapshot.surfaceId, snapshot, seq }])),
    changed: true,
  };
}

function foldMatch(state: A2uiDefinitionState, match: ConversationMatch): A2uiDefinitionState {
  const event = match.event;
  if (event.type === "assistant/chunk") {
    const chunk = event.data.chunk;
    if (chunk.type !== "tool-call-delta") return state;
    let { renderIndex, surfaceId, anchorSeq, location } = state;
    const startsNewRender = chunk.name === A2UI_TOOL_NAME && chunk.index !== renderIndex;
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
      const argsRaw = startsNewRender ? chunk.argumentsDelta : state.argsRaw + chunk.argumentsDelta;
      const previewUpdate = previewFromArguments(argsRaw, event.seq, startsNewRender ? null : state.previewCache);
      return {
        ...state,
        renderIndex,
        surfaceId,
        anchorSeq,
        location,
        argsRaw,
        settled: startsNewRender ? null : state.settled,
        preview: previewUpdate.surfaces ?? (startsNewRender ? null : state.preview),
        previewCache: previewUpdate.cache,
      };
    }
    return { ...state, renderIndex, surfaceId, anchorSeq, location };
  }
  if (event.type === "tool/result" && isA2uiSurfaceMeta(event.data.meta)) {
    const meta = event.data.meta;
    const snapshots = snapshotsFromDocument(meta.document);
    if (snapshots.size === 0) return state;
    const settled = new Map<string, A2uiSurfaceState>();
    for (const snapshot of snapshots.values()) settled.set(snapshot.surfaceId, { surfaceId: snapshot.surfaceId, snapshot, seq: event.seq });
    return {
      ...state,
      // 回放（无流式 chunk）时以 tool/result 事件为锚。
      anchorSeq: state.anchorSeq ?? event.seq,
      location: state.location ?? match.location,
      settled,
    };
  }
  return state;
}

function publication(match: ConversationMatch): ConversationPublication {
  return match.event.type === "assistant/chunk" ? "animation-frame" : "immediate";
}

export function buildA2uiViewNode(context: ConversationNodeContext<A2uiDefinitionState>): ChatConversationViewNode | null {
  const surfaces = context.state?.settled ?? context.state?.preview ?? null;
  const hasSurfaces = surfaces !== null && surfaces.size > 0;
  if (!hasSurfaces && context.state?.anchorSeq === null) return null;
  const data: A2uiChatData = { surfaces: surfaces ?? new Map() };
  return {
    key: context.key,
    kind: "a2ui",
    id: context.id,
    target: "chat",
    anchorSeq: context.state?.anchorSeq ?? context.start?.event.seq ?? 0,
    location: context.state?.location ?? context.start?.location ?? { kind: "unresolved" },
    visibility: hasSurfaces ? "visible" : "hidden",
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
  buildViewNode: buildA2uiViewNode,
};

/** 注册 'a2ui' Definition。 */
export function registerA2uiConversationNode(ctx: Context): void {
  ctx.conversationEvents.register(a2uiDefinition);
}
