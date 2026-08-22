/**
 * a2ui-protocol messages —— 官方 A2UI v0.9.1 消息模型（wire format）。
 *
 * 消息 envelope 的判别 key 是根级字段名（createSurface / updateComponents /
 * updateDataModel / deleteSurface / action / error），version 恒为 "v0.9.1"。
 * 组件采用官方结构 `{ id, component, children?, ...props }`：
 * 扁平列表 + id 引用（adjacency list），根组件 id 必须为 "root"。
 *
 * 注意：协议完整 ≠ Renderer 完整。MVP 只实现 createSurface
 * （= 完整 Surface Snapshot），其余消息定义类型但 Renderer 忽略。
 */

import type { A2uiBoundValue, A2uiVersion } from "./types.js";

/** 官方组件结构：id + component 名 + children 引用 + 平铺属性（props）。 */
export type A2uiComponent = {
  /** 组件 id（引用 key；根组件必须为 "root"）。 */
  id: string;
  /** catalog 中的组件名（白名单在 catalog 层）。 */
  component: string;
  /** 子组件 id 引用（adjacency list）。 */
  children?: string[];
} & Record<string, unknown>;

export type A2uiCreateSurface = {
  surfaceId: string;
  /** catalog 名；缺省时由 guard 归一化为 "dsh-basic"。 */
  catalogId?: string;
  theme?: string;
  sendDataModel?: boolean;
  components?: A2uiComponent[];
};

export type A2uiUpdateComponents = {
  surfaceId: string;
  components: A2uiComponent[];
};

export type A2uiUpdateDataModel = {
  surfaceId: string;
  /** JSON Pointer 路径；缺省表示根。 */
  path?: string;
  /** 缺省表示删除该路径。 */
  value?: unknown;
};

export type A2uiDeleteSurface = {
  surfaceId: string;
};

export type A2uiAction = {
  name: string;
  surfaceId: string;
  sourceComponentId?: string;
  timestamp?: string;
  context?: Record<string, unknown>;
};

export type A2uiError = {
  code: string;
  surfaceId?: string;
  path?: string;
  message: string;
};

export type A2uiMessageKind =
  | "createSurface"
  | "updateComponents"
  | "updateDataModel"
  | "deleteSurface"
  | "action"
  | "error";

/** 官方 v0.9.1 消息 envelope 判别联合。 */
export type A2uiEnvelope =
  | { version: A2uiVersion; createSurface: A2uiCreateSurface }
  | { version: A2uiVersion; updateComponents: A2uiUpdateComponents }
  | { version: A2uiVersion; updateDataModel: A2uiUpdateDataModel }
  | { version: A2uiVersion; deleteSurface: A2uiDeleteSurface }
  | { version: A2uiVersion; action: A2uiAction }
  | { version: A2uiVersion; error: A2uiError };

/** 全部消息 kind（判别用）。 */
export const A2UI_MESSAGE_KINDS: readonly A2uiMessageKind[] = [
  "createSurface",
  "updateComponents",
  "updateDataModel",
  "deleteSurface",
  "action",
  "error",
] as const;

/** 读取 envelope 的消息 kind；非法对象/无匹配 kind → undefined。 */
export function envelopeKind(value: unknown): A2uiMessageKind | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  return A2UI_MESSAGE_KINDS.find((kind) => record[kind] !== undefined);
}

/** 判别：是否为合法 A2UI v0.9.1 envelope（version + 恰好一个消息 key）。 */
export function isA2uiEnvelope(value: unknown): value is A2uiEnvelope {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record.version !== "v0.9.1") {
    return false;
  }
  const kinds = A2UI_MESSAGE_KINDS.filter((kind) => record[kind] !== undefined);
  return kinds.length === 1;
}

/** 便捷引用 A2uiComponent 的属性值类型（供 catalog 与 guard 使用）。 */
export type A2uiComponentPropValue = A2uiBoundValue | string | number | boolean | string[] | string[][] | number[] | Record<string, unknown> | null;
