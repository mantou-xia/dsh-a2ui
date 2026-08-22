/** ECharts ESM bundle 在 NodeNext 下的最小运行时声明。 */
declare module "echarts/dist/echarts.common.js" {
  export type EChartsOption = Record<string, unknown>;
  export interface ECharts {
    setOption(option: EChartsOption, options?: { notMerge?: boolean; lazyUpdate?: boolean }): void;
    resize(): void;
    dispose(): void;
  }
  export function init(element: HTMLDivElement, theme?: unknown, options?: { renderer?: "canvas" }): ECharts;
}
