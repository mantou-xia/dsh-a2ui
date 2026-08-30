/**
 * ECharts 5.5 subpath exports omit a `types` condition. NodeNext therefore
 * resolves their JavaScript entry but not the matching declarations. Keep this
 * bridge intentionally small and limited to the modules registered by us.
 */
declare module "echarts/core" {
  export type EChartsOption = Record<string, unknown>;
  export interface ECharts {
    setOption(option: EChartsOption, options?: { notMerge?: boolean; lazyUpdate?: boolean }): void;
    resize(): void;
    dispose(): void;
  }
  export function init(element: HTMLDivElement, theme?: unknown, options?: { renderer?: "canvas" }): ECharts;
  export function use(extensions: readonly unknown[]): void;
}

declare module "echarts/charts" {
  export const BarChart: unknown;
  export const LineChart: unknown;
  export const PieChart: unknown;
}

declare module "echarts/components" {
  export const DataZoomComponent: unknown;
  export const GridComponent: unknown;
  export const LegendComponent: unknown;
  export const TooltipComponent: unknown;
}

declare module "echarts/renderers" {
  export const CanvasRenderer: unknown;
}
