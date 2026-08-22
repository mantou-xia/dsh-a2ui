/**
 * a2ui-protocol catalog —— DSH 自定义 catalog（catalogId: "dsh-basic"）。
 *
 * 静态组件 6 种（stat/table/chart/card/grid/callout）+ 交互组件 4 种
 * （button/form/input/select）。与官方 basic catalog 组件名不同（映射表见
 * README）：Button→button、TextField→input、ChoicePicker→select、
 * Column/Row/List/Card→grid/card 等。未知组件/属性在 guard 层丢弃。
 */

import type { A2uiCatalog, CatalogComponentDef } from "./types.js";

export const DSH_BASIC_CATALOG_ID = "dsh-basic" as const;

export const DSH_BASIC_CATALOG: A2uiCatalog = {
  catalogId: DSH_BASIC_CATALOG_ID,
  components: [
    {
      component: "stat",
      properties: [
        { name: "label", type: "string", maxLength: 200 },
        { name: "value", type: "string", maxLength: 200 },
        { name: "unit", type: "string", maxLength: 50 },
        { name: "tone", type: "string", maxLength: 20 },
      ],
      limits: { maxStringLength: 200 },
    },
    {
      component: "table",
      properties: [
        { name: "title", type: "string", maxLength: 200 },
        { name: "columns", type: "string[]" },
        { name: "rows", type: "string[][]" },
      ],
      limits: { maxTableRows: 50, maxTableCols: 12, maxStringLength: 2000 },
    },
    {
      component: "chart",
      properties: [
        { name: "title", type: "string", maxLength: 200 },
        // kind 枚举：bars（柱状，默认）/ line（折线）/ donut（环形占比）。
        { name: "kind", type: "string", maxLength: 20 },
        { name: "labels", type: "string[]" },
        { name: "series", type: "object" },
      ],
      limits: { maxChartPoints: 60, maxStringLength: 2000 },
    },
    {
      component: "card",
      properties: [
        { name: "title", type: "string", maxLength: 200 },
        { name: "body", type: "string", maxLength: 2000 },
      ],
      limits: { maxStringLength: 2000 },
    },
    {
      component: "grid",
      properties: [{ name: "columns", type: "number" }],
      limits: { maxChildren: 12, maxStringLength: 2000 },
    },
    {
      component: "callout",
      properties: [
        { name: "tone", type: "string", maxLength: 20 },
        { name: "title", type: "string", maxLength: 200 },
        { name: "body", type: "string", maxLength: 2000 },
      ],
      limits: { maxStringLength: 2000 },
    },
    {
      component: "button",
      properties: [
        { name: "label", type: "string", maxLength: 200 },
        { name: "variant", type: "string", maxLength: 20 },
        { name: "disabled", type: "boolean" },
        // action 声明：{ name, payload? } —— 点击时由前端构造 a2ui/action 回传。
        { name: "action", type: "object" },
      ],
      limits: { maxStringLength: 200 },
    },
    {
      component: "form",
      properties: [
        { name: "title", type: "string", maxLength: 200 },
        // submitAction 声明：{ name, payload? }。
        { name: "submitAction", type: "object" },
      ],
      limits: { maxChildren: 8, maxStringLength: 2000 },
    },
    {
      component: "input",
      properties: [
        { name: "label", type: "string", maxLength: 200 },
        { name: "placeholder", type: "string", maxLength: 200 },
        { name: "type", type: "string", maxLength: 20 },
        { name: "checks", type: "string[]" },
        // 数据绑定（MVP 支持字面量与 {path}；值由前端本地状态管理）。
        { name: "value", type: "bound" },
      ],
      limits: { maxStringLength: 200 },
    },
    {
      component: "select",
      properties: [
        { name: "label", type: "string", maxLength: 200 },
        // options：[{ label, value }]。
        { name: "options", type: "object" },
        { name: "value", type: "bound" },
      ],
      limits: { maxStringLength: 2000 },
    },
  ],
};

export function getCatalogComponent(catalog: A2uiCatalog, component: string): CatalogComponentDef | undefined {
  return catalog.components.find((def) => def.component === component);
}

export function isCatalogComponent(catalog: A2uiCatalog, component: string): boolean {
  return getCatalogComponent(catalog, component) !== undefined;
}

/**
 * 解析 catalogId → catalog。缺省 → dsh-basic；不支持的 catalogId → undefined
 * （guard 据此拒绝整个 surface，不猜未知 catalog 的组件语义）。
 */
export function resolveCatalog(catalogId: string | undefined): A2uiCatalog | undefined {
  if (catalogId === undefined || catalogId === DSH_BASIC_CATALOG_ID) {
    return DSH_BASIC_CATALOG;
  }
  return undefined;
}
