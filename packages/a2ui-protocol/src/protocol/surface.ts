/**
 * a2ui-protocol surface —— surface 形态与构造器。
 *
 * MVP 语义（固定约定）：一个 `createSurface` 消息 = 一个完整可渲染的
 * Surface Snapshot。不遵循官方"创建→增量更新"完整生命周期；新消息到达即
 * `Map.set(surfaceId, newSnapshot)` 整体替换。
 */

import type { A2uiEnvelope, A2uiCreateSurface, A2uiComponent } from "./messages.js";
import { A2UI_VERSION } from "./types.js";

/** 修复后的可渲染 Surface Snapshot（guard 输出形态）。 */
export type A2uiSurfaceSnapshot = {
  surfaceId: string;
  /** 修复后必有（缺省归一化为 "dsh-basic"）。 */
  catalogId: string;
  theme?: string;
  sendDataModel?: boolean;
  /** 修复后必有（root 可达组件树，非空）。 */
  components: A2uiComponent[];
  /** 由 updateDataModel 驱动的 surface 局部状态。 */
  dataModel?: Record<string, unknown>;
};

export type A2uiSurfaceMap = Map<string, A2uiSurfaceSnapshot>;

function pointerParts(path: string | undefined): string[] {
  if (path === undefined || path === "" || !path.startsWith("/")) return [];
  return path.slice(1).split("/").map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
}

function applyDataModelUpdate(model: Record<string, unknown>, path: string | undefined, value: unknown): Record<string, unknown> {
  const parts = pointerParts(path);
  if (parts.length === 0) return value !== null && typeof value === "object" && !Array.isArray(value) ? { ...value } : {};
  const root: Record<string, unknown> = { ...model };
  let target = root;
  for (const part of parts.slice(0, -1)) {
    const current = target[part];
    const next = current !== null && typeof current === "object" && !Array.isArray(current) ? { ...current } : {};
    target[part] = next;
    target = next;
  }
  const leaf = parts.at(-1);
  if (leaf === undefined) return root;
  if (value === undefined) delete target[leaf]; else target[leaf] = value;
  return root;
}

/** 按 A2UI envelope 顺序归约完整 document；无前置 createSurface 的增量消息安全忽略。 */
export function reduceA2uiDocument(messages: readonly A2uiEnvelope[]): A2uiSurfaceMap {
  const surfaces: A2uiSurfaceMap = new Map();
  for (const message of messages) {
    if ("createSurface" in message) {
      const source = message.createSurface;
      surfaces.set(source.surfaceId, {
        surfaceId: source.surfaceId,
        catalogId: source.catalogId ?? "dsh-basic",
        ...(source.theme !== undefined ? { theme: source.theme } : {}),
        ...(source.sendDataModel !== undefined ? { sendDataModel: source.sendDataModel } : {}),
        components: source.components ?? [],
        dataModel: {},
      });
    } else if ("deleteSurface" in message) {
      surfaces.delete(message.deleteSurface.surfaceId);
    } else if ("updateComponents" in message) {
      const current = surfaces.get(message.updateComponents.surfaceId);
      if (current === undefined) continue;
      const byId = new Map(current.components.map((component) => [component.id, component]));
      for (const component of message.updateComponents.components) byId.set(component.id, { ...byId.get(component.id), ...component });
      surfaces.set(current.surfaceId, { ...current, components: [...byId.values()] });
    } else if ("updateDataModel" in message) {
      const current = surfaces.get(message.updateDataModel.surfaceId);
      if (current !== undefined) {
        surfaces.set(current.surfaceId, {
          ...current,
          dataModel: applyDataModelUpdate(current.dataModel ?? {}, message.updateDataModel.path, message.updateDataModel.value),
        });
      }
    }
  }
  return surfaces;
}

/** 从 envelope 读取 createSurface 载荷；非 createSurface → null。 */
export function readCreateSurface(envelope: A2uiEnvelope): A2uiCreateSurface | null {
  if ("createSurface" in envelope) {
    return envelope.createSurface;
  }
  return null;
}

/** 构造一个合法的 createSurface envelope。 */
export function buildCreateSurface(input: {
  surfaceId: string;
  catalogId?: string;
  theme?: string;
  sendDataModel?: boolean;
  components?: A2uiComponent[];
}): A2uiEnvelope {
  return {
    version: A2UI_VERSION,
    createSurface: {
      surfaceId: input.surfaceId,
      ...(input.catalogId !== undefined ? { catalogId: input.catalogId } : {}),
      ...(input.theme !== undefined ? { theme: input.theme } : {}),
      ...(input.sendDataModel !== undefined ? { sendDataModel: input.sendDataModel } : {}),
      ...(input.components !== undefined ? { components: input.components } : {}),
    },
  };
}
