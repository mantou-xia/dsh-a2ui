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
};

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
