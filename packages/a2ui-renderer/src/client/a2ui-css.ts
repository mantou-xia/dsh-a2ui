/**
 * a2ui-renderer 样式 —— 注入式全局样式（<style data-plugin>）。
 *
 * 消费 dsh 设计系统 `--dsw-alias-*` 语义变量（定义在 body 与
 * body[data-ds-dark-theme] 下），跟随主题自动切换；同时保留 fallback
 * 以防 alias 不可用。不使用 CSS Modules（避免依赖 dsh 的 tsdown css 管线）。
 */

export const A2UI_CSS = `
.a2ui-root {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin: 8px 0;
  align-items: stretch;
}
.a2ui-surface {
  width: min(100%, 960px);
}
.a2ui-canvas,
.a2ui-skin-preview {
  --a2ui-canvas-start: var(--dsw-alias-bg-base, #fff);
  --a2ui-canvas-end: var(--dsw-alias-bg-module-platform, rgba(128, 128, 128, 0.06));
  --a2ui-canvas-accent: var(--dsw-alias-brand-primary, #4a90d9);
  --a2ui-canvas-border: var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.22));
  --a2ui-canvas-shadow: rgba(15, 23, 42, 0.10);
  --a2ui-panel-bg: color-mix(in srgb, var(--dsw-alias-bg-base, #fff) 88%, transparent);
  --a2ui-panel-border: var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.25));
  --a2ui-text: var(--dsw-alias-label-primary, #111);
  --a2ui-subtle-text: var(--dsw-alias-label-tertiary, #666);
  --a2ui-button-bg: var(--dsw-alias-bg-module-platform, #f5f5f5);
  --a2ui-button-border: var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.35));
  --a2ui-button-text: var(--dsw-alias-label-primary, #111);
  --a2ui-control-bg: var(--dsw-alias-bg-base, #fff);
  --a2ui-control-border: var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.35));
  --a2ui-control-text: var(--dsw-alias-label-primary, #111);
  --a2ui-control-muted: var(--dsw-alias-label-tertiary, #666);
  --a2ui-control-focus: var(--dsw-alias-brand-primary, #4a90d9);
  --a2ui-control-radius: 8px;
}
.a2ui-canvas {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  box-sizing: border-box;
  padding: clamp(16px, 3vw, 28px);
  border: 1px solid var(--a2ui-canvas-border);
  border-radius: 16px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--a2ui-canvas-accent) 18%, transparent), transparent 38%),
    linear-gradient(145deg, var(--a2ui-canvas-start), var(--a2ui-canvas-end));
  box-shadow: 0 14px 36px var(--a2ui-canvas-shadow);
}
.a2ui-canvas[data-a2ui-skin="soft"],
.a2ui-skin-preview[data-a2ui-skin="soft"] {
  --a2ui-canvas-start: #f7f5ff;
  --a2ui-canvas-end: #e6f3ff;
  --a2ui-canvas-accent: #7c5ce7;
  --a2ui-canvas-border: #cfc4ff;
  --a2ui-canvas-shadow: rgba(103, 80, 185, 0.18);
  --a2ui-panel-bg: rgba(255, 255, 255, 0.78);
  --a2ui-panel-border: #d9d0ff;
  --a2ui-text: #29234a;
  --a2ui-subtle-text: #686081;
  --a2ui-button-bg: #ebe7ff;
  --a2ui-button-border: #c6b8ff;
  --a2ui-button-text: #3e2c85;
  --a2ui-control-bg: rgba(255, 255, 255, 0.92);
  --a2ui-control-border: #bbaaff;
  --a2ui-control-text: #29234a;
  --a2ui-control-muted: #716992;
  --a2ui-control-focus: #7052d8;
  --a2ui-control-radius: 14px;
}
.a2ui-canvas[data-a2ui-skin="contrast"],
.a2ui-skin-preview[data-a2ui-skin="contrast"] {
  --a2ui-canvas-start: #111827;
  --a2ui-canvas-end: #020617;
  --a2ui-canvas-accent: #fbbf24;
  --a2ui-canvas-border: #f8fafc;
  --a2ui-canvas-shadow: rgba(2, 6, 23, 0.42);
  --a2ui-panel-bg: #1f2937;
  --a2ui-panel-border: #f8fafc;
  --a2ui-text: #f8fafc;
  --a2ui-subtle-text: #d1d5db;
  --a2ui-button-bg: #f8fafc;
  --a2ui-button-border: #f8fafc;
  --a2ui-button-text: #111827;
  --a2ui-control-bg: #ffffff;
  --a2ui-control-border: #f8fafc;
  --a2ui-control-text: #111827;
  --a2ui-control-muted: #475569;
  --a2ui-control-focus: #fbbf24;
  --a2ui-control-radius: 4px;
}
.a2ui-canvas::before {
  position: absolute;
  z-index: -1;
  inset: 0;
  content: "";
  opacity: 0.34;
  background-image: linear-gradient(rgba(127, 127, 127, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(127, 127, 127, 0.07) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: linear-gradient(to bottom, #000, transparent 78%);
}
.a2ui-canvas-content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.a2ui-component {
  min-width: 0;
  box-sizing: border-box;
}
.a2ui-stat,
.a2ui-card,
.a2ui-form {
  box-sizing: border-box;
  min-height: 100%;
  padding: 16px;
  border: 1px solid var(--a2ui-panel-border);
  border-radius: 12px;
  background: var(--a2ui-panel-bg);
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
}
.a2ui-stat-value {
  display: block;
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--a2ui-text);
}
.a2ui-stat-label,
.a2ui-field-label,
.a2ui-table th {
  font-size: 12px;
  color: var(--a2ui-subtle-text);
}
.a2ui-stat-label { display: block; margin-top: 6px; }
.a2ui-card-title,
.a2ui-callout-title,
.a2ui-chart-title,
.a2ui-form-title,
.a2ui-table th {
  font-weight: 600;
  color: var(--a2ui-text);
}
.a2ui-card-title,
.a2ui-chart-title,
.a2ui-form-title { font-size: 15px; margin-bottom: 10px; }
.a2ui-callout {
  box-sizing: border-box;
  padding: 14px 16px;
  border: 1px solid var(--a2ui-panel-border);
  border-left: 4px solid var(--dsw-alias-brand-primary, #4a90d9);
  border-radius: 10px;
  background: var(--a2ui-panel-bg);
  color: var(--a2ui-text);
}
.a2ui-callout-tone-warn { border-left-color: var(--dsw-alias-amber-500, #d9a03a); }
.a2ui-callout-tone-error { border-left-color: var(--dsw-alias-red-500, #d94a4a); }
.a2ui-callout-tone-success { border-left-color: var(--dsw-alias-green-500, #4ad97a); }
.a2ui-grid { display: grid; gap: 16px; align-items: stretch; }
.a2ui-grid[data-a2ui-grid-columns="2"] > .a2ui-component[data-a2ui-component="table"],
.a2ui-grid[data-a2ui-grid-columns="2"] > .a2ui-component[data-a2ui-component="chart"],
.a2ui-grid[data-a2ui-grid-columns="2"] > .a2ui-component[data-a2ui-component="form"],
.a2ui-grid[data-a2ui-grid-columns="2"] > .a2ui-component[data-a2ui-component="card"],
.a2ui-grid[data-a2ui-grid-columns="2"] > .a2ui-component[data-a2ui-component="tabs"],
.a2ui-grid[data-a2ui-grid-columns="3"] > .a2ui-component[data-a2ui-component="table"],
.a2ui-grid[data-a2ui-grid-columns="3"] > .a2ui-component[data-a2ui-component="chart"],
.a2ui-grid[data-a2ui-grid-columns="3"] > .a2ui-component[data-a2ui-component="form"],
.a2ui-grid[data-a2ui-grid-columns="3"] > .a2ui-component[data-a2ui-component="card"],
.a2ui-grid[data-a2ui-grid-columns="3"] > .a2ui-component[data-a2ui-component="tabs"],
.a2ui-grid[data-a2ui-grid-columns="4"] > .a2ui-component[data-a2ui-component="table"],
.a2ui-grid[data-a2ui-grid-columns="4"] > .a2ui-component[data-a2ui-component="chart"],
.a2ui-grid[data-a2ui-grid-columns="4"] > .a2ui-component[data-a2ui-component="form"],
.a2ui-grid[data-a2ui-grid-columns="4"] > .a2ui-component[data-a2ui-component="card"],
.a2ui-grid[data-a2ui-grid-columns="4"] > .a2ui-component[data-a2ui-component="tabs"],
.a2ui-grid[data-a2ui-grid-columns="5"] > .a2ui-component[data-a2ui-component="table"],
.a2ui-grid[data-a2ui-grid-columns="5"] > .a2ui-component[data-a2ui-component="chart"],
.a2ui-grid[data-a2ui-grid-columns="5"] > .a2ui-component[data-a2ui-component="form"],
.a2ui-grid[data-a2ui-grid-columns="5"] > .a2ui-component[data-a2ui-component="card"],
.a2ui-grid[data-a2ui-grid-columns="5"] > .a2ui-component[data-a2ui-component="tabs"],
.a2ui-grid[data-a2ui-grid-columns="6"] > .a2ui-component[data-a2ui-component="table"],
.a2ui-grid[data-a2ui-grid-columns="6"] > .a2ui-component[data-a2ui-component="chart"],
.a2ui-grid[data-a2ui-grid-columns="6"] > .a2ui-component[data-a2ui-component="form"],
.a2ui-grid[data-a2ui-grid-columns="6"] > .a2ui-component[data-a2ui-component="card"],
.a2ui-grid[data-a2ui-grid-columns="6"] > .a2ui-component[data-a2ui-component="tabs"] { grid-column: span 2; }
.a2ui-component[data-a2ui-component="table"] { overflow-x: auto; }
.a2ui-table {
  width: 100%;
  border-collapse: collapse;
  overflow: hidden;
  border: 1px solid var(--a2ui-panel-border);
  border-radius: 10px;
  font-size: 13px;
  color: var(--a2ui-text);
}
.a2ui-table th,
.a2ui-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.2));
  text-align: left;
}
.a2ui-table th { background: var(--a2ui-panel-bg); }
.a2ui-table td { color: var(--a2ui-text); }
.a2ui-chart {
  width: 100%;
  height: 280px;
}
.a2ui-button {
  padding: 8px 14px;
  border: 1px solid var(--a2ui-button-border);
  border-radius: 8px;
  background: var(--a2ui-button-bg);
  color: var(--a2ui-button-text);
  cursor: pointer;
  font-size: 13px;
}
.a2ui-button:hover:not(:disabled) {
  border-color: var(--a2ui-control-focus);
  transform: translateY(-1px);
}
.a2ui-button:disabled { opacity: 0.5; cursor: not-allowed; }
.a2ui-button { transition: transform 120ms ease, border-color 120ms ease, background 120ms ease; }
.a2ui-button-variant-primary {
  background: var(--a2ui-control-focus);
  border-color: transparent;
  color: #fff;
}
.a2ui-form { display: flex; flex-direction: column; gap: 12px; }
.a2ui-field { display: flex; flex-direction: column; gap: 6px; }
.a2ui-input,
.a2ui-select {
  box-sizing: border-box;
  width: 100%;
  min-height: 38px;
  padding: 8px 11px;
  border: 1px solid var(--a2ui-control-border);
  border-radius: var(--a2ui-control-radius);
  background: var(--a2ui-control-bg);
  color: var(--a2ui-control-text);
  font-size: 13px;
  min-width: 160px;
}
.a2ui-input::file-selector-button { margin-right: 10px; padding: 5px 9px; border: 0; border-radius: 6px; background: var(--dsw-alias-bg-module-platform, #f5f5f5); color: inherit; font: inherit; cursor: pointer; }
.a2ui-input::placeholder { color: var(--a2ui-control-muted); opacity: 1; }
.a2ui-input:focus-visible,
.a2ui-select:focus-visible,
.a2ui-slider input:focus-visible,
.a2ui-switch-control:focus-visible { outline: 3px solid color-mix(in srgb, var(--a2ui-control-focus) 28%, transparent); outline-offset: 2px; border-color: var(--a2ui-control-focus); }
.a2ui-input:disabled,
.a2ui-select:disabled,
.a2ui-slider input:disabled,
.a2ui-switch-control:disabled { cursor: not-allowed; opacity: 0.56; }
.a2ui-select { appearance: none; background-image: linear-gradient(45deg, transparent 50%, var(--a2ui-control-muted) 50%), linear-gradient(135deg, var(--a2ui-control-muted) 50%, transparent 50%); background-position: calc(100% - 16px) 16px, calc(100% - 11px) 16px; background-size: 5px 5px; background-repeat: no-repeat; padding-right: 32px; }
.a2ui-switch,
.a2ui-slider > span,
.a2ui-pagination,
.a2ui-tab-list,
.a2ui-modal-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.a2ui-switch { color: var(--a2ui-control-text); font-size: 13px; }
.a2ui-switch-control { appearance: none; position: relative; width: 38px; height: 22px; margin: 0; border: 1px solid var(--a2ui-control-border); border-radius: 999px; background: var(--a2ui-control-bg); cursor: pointer; transition: background 120ms ease, border-color 120ms ease; }
.a2ui-switch-control::after { position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 50%; background: var(--a2ui-control-muted); content: ""; transition: transform 120ms ease, background 120ms ease; }
.a2ui-switch-control:checked { border-color: var(--a2ui-control-focus); background: var(--a2ui-control-focus); }
.a2ui-switch-control:checked::after { transform: translateX(16px); background: #fff; }
.a2ui-slider input { width: min(100%, 260px); accent-color: var(--a2ui-control-focus); vertical-align: middle; }
.a2ui-slider output { min-width: 32px; display: inline-block; padding: 3px 6px; border-radius: 5px; background: var(--dsw-alias-bg-module-platform, rgba(128,128,128,.08)); text-align: right; }
.a2ui-pagination { justify-content: flex-end; margin-top: 8px; font-size: 12px; color: var(--dsw-alias-label-tertiary, #666); }
.a2ui-tabs { border: 1px solid var(--a2ui-panel-border); border-radius: 12px; overflow: hidden; background: var(--a2ui-panel-bg); }
.a2ui-tab-list { padding: 6px 8px; border-bottom: 1px solid var(--a2ui-panel-border); background: var(--a2ui-panel-bg); }
.a2ui-tab { padding: 5px 8px; border: 0; border-radius: 4px; background: transparent; color: var(--a2ui-subtle-text); cursor: pointer; }
.a2ui-tab-active { background: var(--a2ui-button-bg); color: var(--a2ui-text); font-weight: 600; }
.a2ui-tab-panel { padding: 16px; }
.a2ui-modal-backdrop { position: fixed; z-index: 30; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(0, 0, 0, 0.45); }
.a2ui-modal { width: min(100%, 560px); max-height: calc(100vh - 40px); overflow: auto; padding: 14px; border-radius: 10px; background: var(--dsw-alias-bg-base, #fff); color: var(--dsw-alias-label-primary, #111); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28); }
.a2ui-modal-header { justify-content: space-between; margin-bottom: 10px; }
.a2ui-modal-close { border: 0; background: transparent; color: inherit; cursor: pointer; font-size: 22px; line-height: 1; }
.a2ui-settings { display: grid; gap: 16px; max-width: 760px; color: var(--dsw-alias-label-primary, #111); }
.a2ui-settings h2, .a2ui-settings h3, .a2ui-settings p { margin: 0; }
.a2ui-settings header { display: grid; gap: 6px; }
.a2ui-settings header p, .a2ui-settings-card > p { color: var(--dsw-alias-label-tertiary, #666); font-size: 13px; line-height: 1.55; }
.a2ui-settings-card { display: grid; gap: 12px; padding: 16px; border: 1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.25)); border-radius: 12px; background: var(--dsw-alias-bg-module-platform, rgba(128,128,128,.06)); }
.a2ui-settings-field { display: grid; gap: 6px; max-width: 280px; font-size: 13px; font-weight: 600; }
.a2ui-settings-field select, .a2ui-settings-import input { min-height: 38px; box-sizing: border-box; padding: 8px 11px; border: 1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.35)); border-radius: 8px; background: var(--dsw-alias-bg-base, #fff); color: var(--dsw-alias-label-primary, #111); }
.a2ui-settings-import { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.a2ui-settings-import input { flex: 1 1 280px; }
.a2ui-settings-status { color: var(--dsw-alias-label-secondary, #444) !important; }
.a2ui-skin-preview { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 86px; box-sizing: border-box; padding: 16px; border: 1px solid var(--a2ui-canvas-border); border-radius: var(--a2ui-control-radius); background: linear-gradient(145deg, var(--a2ui-canvas-start), var(--a2ui-canvas-end)); box-shadow: 0 8px 20px var(--a2ui-canvas-shadow); color: var(--a2ui-text); }
.a2ui-skin-preview > div { display: grid; gap: 4px; }
.a2ui-skin-preview span { color: var(--a2ui-subtle-text); font-size: 13px; }
.a2ui-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 720px) {
  .a2ui-root { gap: 12px; }
  .a2ui-canvas { padding: 14px; border-radius: 12px; }
  .a2ui-grid { grid-template-columns: minmax(0, 1fr) !important; gap: 12px; }
  .a2ui-grid > .a2ui-component { grid-column: span 1 !important; }
  .a2ui-chart { height: 220px; }
}
`;

let injected = false;

/** 注入一次全局样式（data-plugin 标记，卸载由 dsh 加载器清理同名标签）。 */
export function injectA2uiStyles(): void {
  if (injected || typeof document === "undefined") {
    return;
  }
  injected = true;
  const tag = document.createElement("style");
  tag.dataset.plugin = "@dsh-plugin-edu/a2ui-renderer";
  tag.textContent = A2UI_CSS;
  document.head.appendChild(tag);
}
