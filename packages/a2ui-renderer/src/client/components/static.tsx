/**
 * a2ui-renderer 静态组件 —— stat / table / chart / card / grid / callout。
 *
 * props 来自 catalog 白名单（guard 已清洗）；组件是官方结构
 * `{ id, component, children?, ...props }`。图表用内联 SVG。
 */

import type { ReactNode } from "react";
import type { A2uiComponent } from "@dsh-a2ui/a2ui-protocol";

/* ── props 读取工具 ─────────────────────────────────────────────────────── */

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
    ? value.filter((row): row is string[] =>
        Array.isArray(row) && row.every((cell) => typeof cell === "string"))
    : [];
}

/** 归一化 chart series：`{ "系列名": number[] }` → `[{ name, values }]`。 */
export function readSeries(value: unknown): Array<{ name: string; values: number[] }> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [];
  }
  const series: Array<{ name: string; values: number[] }> = [];
  for (const [name, raw] of Object.entries(value)) {
    if (!Array.isArray(raw)) {
      continue;
    }
    const values = raw.map((item) =>
      typeof item === "number" && Number.isFinite(item) ? item : 0);
    if (values.length > 0) {
      series.push({ name, values });
    }
  }
  return series;
}

/* ── stat ───────────────────────────────────────────────────────────────── */

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

/* ── table ──────────────────────────────────────────────────────────────── */

export function TableView({ component }: { component: A2uiComponent }): ReactNode {
  const columns = strArr(component, "columns");
  const rows = strArr2(component, "rows");
  const title = str(component, "title");
  return (
    <div>
      {title && <div className="a2ui-chart-title">{title}</div>}
      {columns.length > 0 ? (
        <table className="a2ui-table">
          <thead>
            <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {columns.map((column, columnIndex) => (
                  <td key={column}>{row[columnIndex] ?? ""}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="a2ui-table">
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ── chart（SVG：bars / line / donut） ──────────────────────────────────── */

const CHART_HEIGHT = 160;
const CHART_PADDING = 4;

/** 未知 kind 降级为 bars（不渲染空块）。 */
export function normalizeChartKind(value: string): "bars" | "line" | "donut" {
  return value === "line" || value === "donut" ? value : "bars";
}

function BarsChart({ labels, series }: { labels: string[]; series: Array<{ name: string; values: number[] }> }): ReactNode {
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const groupWidth = 120 / Math.max(1, labels.length);
  const barWidth = Math.max(2, groupWidth / Math.max(1, series.length) - 2);
  return (
    <svg viewBox="0 0 120 160" width="100%" role="img" aria-label="bar chart">
      {series.map((s, seriesIndex) =>
        labels.map((label, index) => {
          const value = s.values[index] ?? 0;
          const height = (value / max) * (CHART_HEIGHT - CHART_PADDING * 2);
          const x = index * groupWidth + seriesIndex * (barWidth + 1) + 1;
          const y = CHART_HEIGHT - CHART_PADDING - height;
          return (
            <g key={`${s.name}-${label}`}>
              <rect x={x} y={y} width={barWidth} height={height} fill={`hsl(${seriesIndex * 60}, 60%, 55%)`} />
              <title>{`${s.name} · ${label}: ${value}`}</title>
            </g>
          );
        }),
      )}
    </svg>
  );
}

function LineChart({ labels, series }: { labels: string[]; series: Array<{ name: string; values: number[] }> }): ReactNode {
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const points = (values: number[]): string =>
    values.map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * 116 + 2;
      const y = CHART_HEIGHT - CHART_PADDING - (value / max) * (CHART_HEIGHT - CHART_PADDING * 2);
      return `${x},${y}`;
    }).join(" ");
  return (
    <svg viewBox="0 0 120 160" width="100%" role="img" aria-label="line chart">
      {series.map((s, index) => (
        <polyline
          key={s.name}
          points={points(s.values)}
          fill="none"
          stroke={`hsl(${index * 60}, 60%, 55%)`}
          strokeWidth="2"
        />
      ))}
      {labels.map((label, index) => {
        const x = (index / Math.max(1, labels.length - 1)) * 116 + 2;
        return (
          <text key={label} x={x} y={158} fontSize="5" textAnchor="middle" fill="currentColor">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

function DonutChart({ series }: { series: Array<{ name: string; values: number[] }> }): ReactNode {
  const total = series.reduce((sum, s) => sum + (s.values[0] ?? 0), 0);
  if (total <= 0) {
    return <div className="a2ui-stat-label">无数据</div>;
  }
  let angle = 0;
  return (
    <svg viewBox="0 0 120 120" width="100%" role="img" aria-label="donut chart">
      <circle cx="60" cy="60" r="40" fill="none" strokeWidth="20" stroke="rgba(128,128,128,.15)" />
      {series.map((s, index) => {
        const value = s.values[0] ?? 0;
        const fraction = value / total;
        const start = angle;
        const end = angle + fraction * 360;
        angle = end;
        const large = fraction > 0.5 ? 1 : 0;
        const x1 = 60 + 40 * Math.cos((start * Math.PI) / 180);
        const y1 = 60 + 40 * Math.sin((start * Math.PI) / 180);
        const x2 = 60 + 40 * Math.cos((end * Math.PI) / 180);
        const y2 = 60 + 40 * Math.sin((end * Math.PI) / 180);
        return (
          <g key={s.name}>
            <path
              d={`M60,60 L${x1},${y1} A40,40 0 ${large} 1 ${x2},${y2} Z`}
              fill={`hsl(${index * 60}, 60%, 55%)`}
            />
            <title>{`${s.name}: ${value}（${Math.round(fraction * 100)}%）`}</title>
          </g>
        );
      })}
      <circle cx="60" cy="60" r="24" fill="var(--ui-kit-color-surface, #fff)" />
    </svg>
  );
}

export function ChartView({ component }: { component: A2uiComponent }): ReactNode {
  const title = str(component, "title");
  const labels = strArr(component, "labels");
  const series = readSeries(component["series"]);
  const kind = normalizeChartKind(str(component, "kind"));
  const hasData = series.some((s) => s.values.length > 0);
  return (
    <div>
      {title && <div className="a2ui-chart-title">{title}</div>}
      {!hasData
        ? <div className="a2ui-stat-label">无数据</div>
        : kind === "bars"
          ? <BarsChart labels={labels} series={series} />
          : kind === "line"
            ? <LineChart labels={labels} series={series} />
            : <DonutChart series={series} />}
    </div>
  );
}

/* ── card / grid / callout ──────────────────────────────────────────────── */

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
  return (
    <div className="a2ui-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {children}
    </div>
  );
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
