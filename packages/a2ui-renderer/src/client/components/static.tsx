/** dsh-basic 静态组件：stat / table / chart / card / grid / callout。 */

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { A2uiComponent } from "@dsh-a2ui/a2ui-protocol";
import { createChartOption, EchartsView, type ChartSeries } from "./EchartsView.tsx";

function str(component: A2uiComponent, key: string, fallback = ""): string {
  const value = component[key];
  return typeof value === "string" ? value : fallback;
}

function num(component: A2uiComponent, key: string, fallback = 0): number {
  const value = component[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function strArr(component: A2uiComponent, key: string): string[] {
  const value = component[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function strArr2(component: A2uiComponent, key: string): string[][] {
  const value = component[key];
  return Array.isArray(value)
    ? value.filter((row): row is string[] => Array.isArray(row) && row.every((cell) => typeof cell === "string"))
    : [];
}

/** 将标准 `{ "系列名": number[] }` 映射为 ECharts 系列。 */
export function readSeries(value: unknown): ChartSeries {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return [];
  const series: ChartSeries = [];
  for (const [name, raw] of Object.entries(value)) {
    if (!Array.isArray(raw)) continue;
    const values = raw.map((item) => typeof item === "number" && Number.isFinite(item) ? item : 0);
    if (values.length > 0) series.push({ name, values });
  }
  return series;
}

export function StatView({ component }: { component: A2uiComponent }): ReactNode {
  return (
    <div className="a2ui-stat">
      <span className="a2ui-stat-value">
        {str(component, "value")}{str(component, "unit") && <span className="a2ui-stat-label"> {str(component, "unit")}</span>}
      </span>
      {str(component, "label") && <span className="a2ui-stat-label">{str(component, "label")}</span>}
    </div>
  );
}

export function TableView({ component }: { component: A2uiComponent }): ReactNode {
  const columns = strArr(component, "columns");
  const rows = strArr2(component, "rows");
  const title = str(component, "title");
  const pageSize = Math.max(0, Math.round(num(component, "pageSize")));
  const pageCount = pageSize > 0 ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
  const [page, setPage] = useState(0);
  const currentPage = Math.min(page, pageCount - 1);
  const visibleRows = pageSize > 0 ? rows.slice(currentPage * pageSize, (currentPage + 1) * pageSize) : rows;
  return (
    <div>
      {title && <div className="a2ui-chart-title">{title}</div>}
      {columns.length > 0 ? (
        <table className="a2ui-table">
          <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
          <tbody>{visibleRows.map((row, index) => <tr key={index}>{columns.map((column, columnIndex) => <td key={column}>{row[columnIndex] ?? ""}</td>)}</tr>)}</tbody>
        </table>
      ) : (
        <table className="a2ui-table"><tbody>{visibleRows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table>
      )}
      {pageSize > 0 && rows.length > pageSize && <nav className="a2ui-pagination" aria-label={`${title || "表格"}分页`}><button type="button" className="a2ui-button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>上一页</button><span>{currentPage + 1} / {pageCount}</span><button type="button" className="a2ui-button" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>下一页</button></nav>}
    </div>
  );
}

export function normalizeChartKind(value: string): "bars" | "line" | "donut" {
  return value === "line" || value === "donut" ? value : "bars";
}

function chartSummary(title: string, kind: string, labels: string[], series: ChartSeries, explicit: string): string {
  if (explicit) return explicit;
  const seriesText = series.map((item) => `${item.name}：${item.values.join("、")}`).join("；");
  const labelText = labels.length > 0 ? `横轴为${labels.join("、")}` : "横轴使用数据序号";
  return `${title || kind + "图表"}。${labelText}。数据为${seriesText || "暂无数据"}。`;
}

export function ChartView({ component, colorScheme }: { component: A2uiComponent; colorScheme: "light" | "dark" }): ReactNode {
  const title = str(component, "title");
  const labels = strArr(component, "labels");
  const series = readSeries(component["series"]);
  const kind = normalizeChartKind(str(component, "kind"));
  const hasData = series.some((item) => item.values.length > 0);
  const stacked = component.stacked === true;
  const zoom = component.zoom === true;
  const overview = component.overview === true;
  const yAxes = Array.isArray(component.yAxes) ? component.yAxes.filter((axis): axis is Record<string, unknown> => typeof axis === "object" && axis !== null && !Array.isArray(axis)) : [];
  const seriesAxes = typeof component.seriesAxes === "object" && component.seriesAxes !== null && !Array.isArray(component.seriesAxes) ? component.seriesAxes as Record<string, unknown> : {};
  const summary = chartSummary(title, kind, labels, series, str(component, "summary"));
  const option = useMemo(() => createChartOption(kind, labels, series, colorScheme, { stacked, yAxes, seriesAxes, zoom, overview }), [colorScheme, kind, labels, overview, series, seriesAxes, stacked, yAxes, zoom]);
  return (
    <div>
      {title && <div className="a2ui-chart-title">{title}</div>}
      {hasData ? <EchartsView option={option} label={summary} /> : <div className="a2ui-stat-label">暂无数据</div>}
      {hasData && <div className="a2ui-sr-only">{summary}</div>}
    </div>
  );
}

export function CardView({ component, children }: { component: A2uiComponent; children?: ReactNode }): ReactNode {
  return (
    <div className="a2ui-card">
      {str(component, "title") && <div className="a2ui-card-title">{str(component, "title")}</div>}
      <div>{str(component, "body")}{children}</div>
    </div>
  );
}

export function GridView({ component, children }: { component: A2uiComponent; children?: ReactNode }): ReactNode {
  const columns = Math.max(1, Math.min(6, Math.round(num(component, "columns", 2))));
  return <div className="a2ui-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{children}</div>;
}

export function TabsView({ component, children }: { component: A2uiComponent; children?: ReactNode }): ReactNode {
  const labels = strArr(component, "labels");
  const tabs = Array.isArray(children) ? children : children === undefined ? [] : [children];
  const maxIndex = Math.max(0, tabs.length - 1);
  const initial = Math.min(maxIndex, Math.max(0, Math.round(num(component, "active"))));
  const [active, setActive] = useState(initial);
  const current = Math.min(active, maxIndex);
  if (tabs.length === 0) return null;
  return <div className="a2ui-tabs"><div className="a2ui-tab-list" role="tablist">{tabs.map((_, index) => <button key={index} type="button" role="tab" aria-selected={current === index} className={`a2ui-tab${current === index ? " a2ui-tab-active" : ""}`} onClick={() => setActive(index)}>{labels[index] || `标签 ${index + 1}`}</button>)}</div><div role="tabpanel" className="a2ui-tab-panel">{tabs[current]}</div></div>;
}

export function CalloutView({ component }: { component: A2uiComponent }): ReactNode {
  const tone = str(component, "tone");
  const toneClass = tone === "warn" || tone === "error" || tone === "success" ? ` a2ui-callout-tone-${tone}` : "";
  return (
    <div className={`a2ui-callout${toneClass}`}>
      {str(component, "title") && <div className="a2ui-callout-title">{str(component, "title")}</div>}
      <div>{str(component, "body")}</div>
    </div>
  );
}
