/** A2UI 图表的 ECharts 实现：按需注册并在 React 生命周期内管理实例。 */

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { ECharts, EChartsOption } from "echarts/dist/echarts.common.js";
import * as echarts from "echarts/dist/echarts.common.js";

export type ChartSeries = Array<{ name: string; values: number[] }>;
export type ChartKind = "bars" | "line" | "donut";

const CHART_COLORS = ["#5b8ff9", "#61dDAa", "#65789b", "#f6bd16", "#7262fd", "#78d3f8"];

function axisLabels(labels: string[], series: ChartSeries): string[] {
  if (labels.length > 0) return labels;
  const count = Math.max(0, ...series.map((item) => item.values.length));
  return Array.from({ length: count }, (_, index) => String(index + 1));
}

/** 将 dsh-basic 的已清洗 chart 属性映射为 ECharts option。 */
export function createChartOption(kind: ChartKind, labels: string[], series: ChartSeries): EChartsOption {
  if (kind === "donut") {
    return {
      color: CHART_COLORS,
      tooltip: { trigger: "item" },
      legend: { bottom: 0, type: "scroll" },
      series: [{
        type: "pie",
        radius: ["42%", "68%"],
        avoidLabelOverlap: true,
        data: series.map((item) => ({ name: item.name, value: item.values[0] ?? 0 })),
      }],
    };
  }

  const option: EChartsOption = {
    color: CHART_COLORS,
    tooltip: { trigger: "axis" },
    grid: { top: series.length > 1 ? 38 : 16, right: 16, bottom: 32, left: 40, containLabel: true },
    xAxis: { type: "category", data: axisLabels(labels, series), axisTick: { alignWithLabel: true } },
    yAxis: { type: "value", minInterval: 1 },
    series: series.map((item) => ({
      name: item.name,
      type: kind === "line" ? "line" : "bar",
      data: item.values,
      smooth: kind === "line",
      emphasis: { focus: "series" },
    })),
  };
  if (series.length > 1) option.legend = { top: 0, type: "scroll" };
  return option;
}

export function EchartsView({ option, label }: { option: EChartsOption; label: string }): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return undefined;
    const chart = echarts.init(container, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(() => chart.resize());
    observer?.observe(container);
    return () => {
      observer?.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true, lazyUpdate: true });
  }, [option]);

  return <div ref={containerRef} className="a2ui-chart" role="img" aria-label={label} />;
}
