/** A2UI 图表的 ECharts 实现：按需注册并在 React 生命周期内管理实例。 */

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import { DataZoomComponent, GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { init, use } from "echarts/core";
import type { ECharts, EChartsOption } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

// Keep the client bundle limited to catalog-supported chart kinds and their UI primitives.
use([BarChart, LineChart, PieChart, DataZoomComponent, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

export type ChartSeries = Array<{ name: string; values: number[] }>;
export type ChartKind = "bars" | "line" | "donut";
export type ChartAxis = { name: string; position?: "left" | "right"; min?: number; max?: number };
export type ChartFeatures = {
  stacked?: boolean;
  yAxes?: Array<Record<string, unknown>>;
  seriesAxes?: Record<string, unknown>;
  zoom?: boolean;
  overview?: boolean;
};

const CHART_COLORS = ["#5b8ff9", "#61dDAa", "#65789b", "#f6bd16", "#7262fd", "#78d3f8"];

function axisLabels(labels: string[], series: ChartSeries): string[] {
  if (labels.length > 0) return labels;
  const count = Math.max(0, ...series.map((item) => item.values.length));
  return Array.from({ length: count }, (_, index) => String(index + 1));
}

function chartAxes(features: ChartFeatures): ChartAxis[] {
  const axes = (features.yAxes ?? []).map((axis): ChartAxis | undefined => {
    const name = typeof axis.name === "string" ? axis.name : "";
    const position = axis.position === "right" ? "right" : "left";
    const min = typeof axis.min === "number" && Number.isFinite(axis.min) ? axis.min : undefined;
    const max = typeof axis.max === "number" && Number.isFinite(axis.max) ? axis.max : undefined;
    return name || min !== undefined || max !== undefined
      ? { name, position, ...(min === undefined ? {} : { min }), ...(max === undefined ? {} : { max }) }
      : undefined;
  }).filter((axis): axis is ChartAxis => axis !== undefined);
  return axes.length > 0 ? axes : [{ name: "", position: "left" }];
}

/** 将 dsh-basic 的已清洗 chart 属性映射为 ECharts option。 */
export function createChartOption(kind: ChartKind, labels: string[], series: ChartSeries, colorScheme: "light" | "dark" = "light", features: ChartFeatures = {}): EChartsOption {
  const textColor = colorScheme === "dark" ? "#e6e6e6" : "#303133";
  const axisColor = colorScheme === "dark" ? "#5a5a5a" : "#d9d9d9";
  if (kind === "donut") {
    return {
      color: CHART_COLORS,
      tooltip: { trigger: "item", textStyle: { color: textColor } },
      legend: { bottom: 0, type: "scroll", textStyle: { color: textColor } },
      series: [{
        type: "pie",
        radius: ["42%", "68%"],
        avoidLabelOverlap: true,
        data: series.map((item) => ({ name: item.name, value: item.values[0] ?? 0 })),
      }],
    };
  }

  const axes = chartAxes(features);
  const zoomEnabled = features.zoom === true || features.overview === true;
  const seriesAxes = features.seriesAxes ?? {};
  const option: EChartsOption = {
    color: CHART_COLORS,
    tooltip: { trigger: "axis", textStyle: { color: textColor } },
    grid: { top: series.length > 1 ? 38 : 16, right: axes.some((axis) => axis.position === "right") ? 56 : 16, bottom: zoomEnabled ? 62 : 32, left: 40, containLabel: true },
    xAxis: { type: "category", data: axisLabels(labels, series), axisTick: { alignWithLabel: true }, axisLabel: { color: textColor }, axisLine: { lineStyle: { color: axisColor } } },
    yAxis: axes.map((axis) => ({ type: "value", name: axis.name, position: axis.position, ...(axis.min === undefined ? {} : { min: axis.min }), ...(axis.max === undefined ? {} : { max: axis.max }), minInterval: 1, axisLabel: { color: textColor }, nameTextStyle: { color: textColor }, splitLine: { lineStyle: { color: axisColor } } })),
    series: series.map((item) => {
      const axisIndex = seriesAxes[item.name];
      return {
        name: item.name,
        type: kind === "line" ? "line" : "bar",
        data: item.values,
        smooth: kind === "line",
        ...(features.stacked === true ? { stack: "total" } : {}),
        ...(typeof axisIndex === "number" && axisIndex >= 0 && axisIndex < axes.length ? { yAxisIndex: axisIndex } : {}),
        emphasis: { focus: "series" },
      };
    }),
  };
  if (series.length > 1) option.legend = { top: 0, type: "scroll", textStyle: { color: textColor } };
  if (zoomEnabled) option.dataZoom = [
    { type: "inside", xAxisIndex: 0 },
    ...(features.overview === true ? [{ type: "slider", xAxisIndex: 0, bottom: 6, height: 18 }] : []),
  ];
  return option;
}

export function EchartsView({ option, label }: { option: EChartsOption; label: string }): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return undefined;
    const chart = init(container, undefined, { renderer: "canvas" });
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
