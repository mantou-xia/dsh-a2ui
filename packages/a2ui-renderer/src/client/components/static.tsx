/** dsh-basic 静态组件：stat / table / chart / card / grid / callout。 */

import { useMemo } from "react";
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
  return (
    <div>
      {title && <div className="a2ui-chart-title">{title}</div>}
      {columns.length > 0 ? (
        <table className="a2ui-table">
          <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => <tr key={index}>{columns.map((column, columnIndex) => <td key={column}>{row[columnIndex] ?? ""}</td>)}</tr>)}</tbody>
        </table>
      ) : (
        <table className="a2ui-table"><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table>
      )}
    </div>
  );
}

export function normalizeChartKind(value: string): "bars" | "line" | "donut" {
  return value === "line" || value === "donut" ? value : "bars";
}

export function ChartView({ component, colorScheme }: { component: A2uiComponent; colorScheme: "light" | "dark" }): ReactNode {
  const title = str(component, "title");
  const labels = strArr(component, "labels");
  const series = readSeries(component["series"]);
  const kind = normalizeChartKind(str(component, "kind"));
  const hasData = series.some((item) => item.values.length > 0);
  const option = useMemo(() => createChartOption(kind, labels, series, colorScheme), [kind, labels, series, colorScheme]);
  return (
    <div>
      {title && <div className="a2ui-chart-title">{title}</div>}
      {hasData ? <EchartsView option={option} label={`${kind} chart`} /> : <div className="a2ui-stat-label">暂无数据</div>}
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
