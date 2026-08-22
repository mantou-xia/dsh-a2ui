/**
 * a2ui-protocol types —— 共享基础类型与硬限额常量。
 *
 * 本包零运行时依赖；协议层严格对应 A2UI v0.9.1（a2ui.org），
 * 组件名/属性属于 catalog 层（DSH 自定义扩展点）。
 */

/** 支持的协议版本（当前生产版 v0.9.1）。 */
export const A2UI_VERSION = "v0.9.1" as const;

export type A2uiVersion = typeof A2UI_VERSION;

/** 数据绑定值：字面量 | 路径引用 | 函数调用（官方 Dynamic* 三形态）。MVP 支持字面量与 {path}。 */
export type A2uiBoundValue =
  | { path: string }
  | { call: string; args: Record<string, unknown> };

/** 组件属性值类型（catalog 白名单校验在 guard 层）。 */
export type A2uiComponentPropertyValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | number[]
  | string[][]
  | Record<string, unknown>
  | A2uiBoundValue;

/** 数据模型（与组件结构分离；MVP 不实现 dataModel 生命周期）。 */
export type A2uiDataModel = Record<string, unknown>;

/** 硬限额（安全边界；catalog 可在此基础上收紧单组件限额）。 */
export const A2UI_LIMITS = {
  /** 组件总数上限。 */
  maxComponents: 200,
  /** 组件树深度上限（root 为第 1 层）。 */
  maxDepth: 8,
  /** 字符串字段总长度上限。 */
  maxString: 2000,
  /** 组件 id 长度上限。 */
  maxIdLength: 128,
  /** 组件名（catalog component）长度上限。 */
  maxComponentNameLength: 64,
  /** 单个组件 children 引用数量上限。 */
  maxChildren: 200,
} as const;
