/**
 * a2ui-protocol catalog types —— catalog 定义类型。
 *
 * Catalog 是官方协议中 `catalogId` 的合法扩展点：组件结构沿用官方
 * `{ id, component, ...props }`，但组件名与属性白名单由本层声明。
 * guard 只允许 catalog 白名单内的组件与属性通过。
 */

/** 属性值类型（guard 据此清洗）。 */
export type CatalogPropertyType =
  | "string"
  | "number"
  | "boolean"
  | "string[]"
  | "string[][]"
  | "number[]"
  | "object"
  /** 图表序列：接受 catalog 声明的对象或数组写法，并归一为 renderer 的对象写法。 */
  | "chart-series"
  /** 数据绑定值：字面量 | {path} | {call, args}。 */
  | "bound";

export type CatalogProperty = {
  name: string;
  type: CatalogPropertyType;
  /** 单个字符串字段硬上限（超限截断）。 */
  maxLength?: number;
};

export type CatalogLimits = {
  /** 子组件引用数量上限（grid/form 等容器）。 */
  maxChildren?: number;
  maxTableRows?: number;
  maxTableCols?: number;
  maxChartPoints?: number;
  /** 该组件字符串属性总长度上限。 */
  maxStringLength: number;
};

export type CatalogComponentDef = {
  /** 组件名（白名单 key，即官方组件结构的 component 字段）。 */
  component: string;
  /** 允许的属性白名单。 */
  properties: CatalogProperty[];
  limits: CatalogLimits;
};

/** 一个完整 catalog（对应 createSurface.catalogId）。 */
export type A2uiCatalog = {
  catalogId: string;
  components: readonly CatalogComponentDef[];
};
