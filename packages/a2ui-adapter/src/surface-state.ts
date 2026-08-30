/**
 * 已验证 surface 的会话级状态。
 *
 * 模型重绘使用完整快照，但实际输出偶尔会遗漏 chart.series。这里保留上一份
 * 已验证快照，并只在同 id、同类型图表遗漏数据字段时补回。显式传入空对象仍
 * 表示清空，避免把状态合并变成无法撤销的“语义猜测”。
 */

import type { A2uiComponent, A2uiCreateSurface, A2uiEnvelope, A2uiVersion } from "@dsh-plugin-edu/a2ui-protocol";

export type A2uiCreateSurfaceEnvelope = {
  version: A2uiVersion;
  createSurface: A2uiCreateSurface;
};

type SessionEventLike = {
  type?: unknown;
  data?: { meta?: unknown };
};

type AgentLike = {
  session?: { events?: readonly SessionEventLike[] };
};

type SurfaceMetaLike = {
  kind?: unknown;
  document?: unknown;
};

const CHART_DATA_KEYS = ["labels", "series"] as const;

function isCreateSurface(envelope: A2uiEnvelope): envelope is A2uiCreateSurfaceEnvelope {
  return "createSurface" in envelope;
}

function parseCreateSurface(document: string): A2uiCreateSurfaceEnvelope | undefined {
  for (const line of document.split("\n")) {
    try {
      const parsed: unknown = JSON.parse(line);
      if (typeof parsed !== "object" || parsed === null || !("createSurface" in parsed)) continue;
      const envelope = parsed as A2uiEnvelope;
      if (isCreateSurface(envelope)) return envelope;
    } catch {
      // 损坏的历史 meta 不影响当前工具调用。
    }
  }
  return undefined;
}

/** 从 durable tool/result.meta 恢复指定业务 surface 的最近快照。 */
function restoreSurface(agent: AgentLike, surfaceId: string): A2uiCreateSurfaceEnvelope | undefined {
  const events = agent.session?.events;
  if (events === undefined) return undefined;
  for (let index = events.length - 1; index >= 0; index--) {
    const event = events[index];
    if (event?.type !== "tool/result") continue;
    const meta = event.data?.meta as SurfaceMetaLike | undefined;
    if (meta?.kind !== "a2ui-surface" || typeof meta.document !== "string") continue;
    const envelope = parseCreateSurface(meta.document);
    if (envelope?.createSurface.surfaceId === surfaceId) return envelope;
  }
  return undefined;
}

function preserveChartData(previous: A2uiComponent, incoming: A2uiComponent): A2uiComponent {
  if (previous.component !== "chart" || incoming.component !== "chart" || previous.id !== incoming.id) {
    return incoming;
  }
  const carried: Record<string, unknown> = {};
  for (const key of CHART_DATA_KEYS) {
    if (!(key in incoming) && key in previous) carried[key] = previous[key];
  }
  return Object.keys(carried).length === 0 ? incoming : { ...incoming, ...carried };
}

/**
 * 合并模型重绘与上一份权威快照。
 *
 * 仅补齐同一 surface 中、同 id 的 chart 遗漏的 labels/series；其余组件及
 * 属性完全以模型新快照为准。这直接防止“重绘时漏写 series 导致图表无数据”。
 */
export function mergeA2uiSurface(
  previous: A2uiCreateSurfaceEnvelope | undefined,
  incoming: A2uiCreateSurfaceEnvelope,
): A2uiCreateSurfaceEnvelope {
  if (previous === undefined) return incoming;
  if (previous.createSurface.surfaceId !== incoming.createSurface.surfaceId) return incoming;

  const oldComponents = new Map((previous.createSurface.components ?? []).map((component) => [component.id, component]));
  const components = (incoming.createSurface.components ?? []).map((component) =>
    preserveChartData(oldComponents.get(component.id) ?? component, component),
  );
  return {
    ...incoming,
    createSurface: { ...incoming.createSurface, components },
  };
}

/**
 * 按 agent/session 隔离的短期缓存；WeakMap 会随着 session agent 释放。
 * 会话恢复后优先从 durable tool/result.meta 回填，因此缓存不是唯一事实来源。
 */
export class A2uiSurfaceStateStore {
  private readonly surfaces = new WeakMap<object, Map<string, A2uiCreateSurfaceEnvelope>>();

  merge(agent: object | undefined, incoming: A2uiCreateSurfaceEnvelope): A2uiCreateSurfaceEnvelope {
    if (agent === undefined) return incoming;
    const surfaceId = incoming.createSurface.surfaceId;
    let entries = this.surfaces.get(agent);
    if (entries === undefined) {
      entries = new Map();
      this.surfaces.set(agent, entries);
    }
    const previous = entries.get(surfaceId) ?? restoreSurface(agent as AgentLike, surfaceId);
    const merged = mergeA2uiSurface(previous, incoming);
    entries.set(surfaceId, merged);
    return merged;
  }
}
