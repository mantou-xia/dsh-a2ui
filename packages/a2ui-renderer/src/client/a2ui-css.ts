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
  gap: 12px;
  margin: 4px 0;
}
.a2ui-surface {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.a2ui-stat,
.a2ui-card,
.a2ui-form {
  padding: 10px 14px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.25));
  border-radius: 8px;
  background: var(--dsw-alias-bg-module-platform, rgba(128, 128, 128, 0.06));
}
.a2ui-stat-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #111);
}
.a2ui-stat-label,
.a2ui-field-label,
.a2ui-table th {
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary, #666);
}
.a2ui-card-title,
.a2ui-callout-title,
.a2ui-chart-title,
.a2ui-form-title,
.a2ui-table th {
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #111);
}
.a2ui-card-title { margin-bottom: 4px; }
.a2ui-callout {
  padding: 10px 14px;
  border-left: 3px solid var(--dsw-alias-brand-primary, #4a90d9);
  border-radius: 4px;
  background: var(--dsw-alias-bg-module-platform, rgba(128, 128, 128, 0.06));
  color: var(--dsw-alias-label-primary, #111);
}
.a2ui-callout-tone-warn { border-left-color: var(--dsw-alias-amber-500, #d9a03a); }
.a2ui-callout-tone-error { border-left-color: var(--dsw-alias-red-500, #d94a4a); }
.a2ui-callout-tone-success { border-left-color: var(--dsw-alias-green-500, #4ad97a); }
.a2ui-grid { display: grid; gap: 10px; }
.a2ui-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  color: var(--dsw-alias-label-primary, #111);
}
.a2ui-table th,
.a2ui-table td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.2));
  text-align: left;
}
.a2ui-table td { color: var(--dsw-alias-label-primary, #111); }
.a2ui-chart-title { font-size: 13px; margin-bottom: 6px; }
.a2ui-chart {
  width: min(100%, 560px);
  height: 240px;
}
.a2ui-button {
  padding: 6px 14px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.35));
  border-radius: 6px;
  background: var(--dsw-alias-bg-module-platform, #f5f5f5);
  color: var(--dsw-alias-label-primary, #111);
  cursor: pointer;
  font-size: 13px;
}
.a2ui-button:hover:not(:disabled) {
  border-color: var(--dsw-alias-brand-primary, #4a90d9);
}
.a2ui-button:disabled { opacity: 0.5; cursor: not-allowed; }
.a2ui-button-variant-primary {
  background: var(--dsw-alias-brand-primary, #4a90d9);
  border-color: transparent;
  color: #fff;
}
.a2ui-form { display: flex; flex-direction: column; gap: 10px; }
.a2ui-field { display: flex; flex-direction: column; gap: 4px; }
.a2ui-input,
.a2ui-select {
  padding: 6px 10px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.35));
  border-radius: 6px;
  background: var(--dsw-alias-bg-base, #fff);
  color: var(--dsw-alias-label-primary, #111);
  font-size: 13px;
  min-width: 160px;
}
.a2ui-switch,
.a2ui-slider > span,
.a2ui-pagination,
.a2ui-tab-list,
.a2ui-modal-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.a2ui-switch { color: var(--dsw-alias-label-primary, #111); font-size: 13px; }
.a2ui-slider input { vertical-align: middle; }
.a2ui-slider output { min-width: 24px; display: inline-block; text-align: right; }
.a2ui-pagination { justify-content: flex-end; margin-top: 8px; font-size: 12px; color: var(--dsw-alias-label-tertiary, #666); }
.a2ui-tabs { border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.25)); border-radius: 8px; overflow: hidden; }
.a2ui-tab-list { padding: 4px 6px; border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.25)); }
.a2ui-tab { padding: 5px 8px; border: 0; border-radius: 4px; background: transparent; color: var(--dsw-alias-label-tertiary, #666); cursor: pointer; }
.a2ui-tab-active { background: var(--dsw-alias-bg-module-platform, rgba(128, 128, 128, 0.08)); color: var(--dsw-alias-label-primary, #111); font-weight: 600; }
.a2ui-tab-panel { padding: 10px 14px; }
.a2ui-modal-backdrop { position: fixed; z-index: 30; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(0, 0, 0, 0.45); }
.a2ui-modal { width: min(100%, 560px); max-height: calc(100vh - 40px); overflow: auto; padding: 14px; border-radius: 10px; background: var(--dsw-alias-bg-base, #fff); color: var(--dsw-alias-label-primary, #111); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28); }
.a2ui-modal-header { justify-content: space-between; margin-bottom: 10px; }
.a2ui-modal-close { border: 0; background: transparent; color: inherit; cursor: pointer; font-size: 22px; line-height: 1; }
.a2ui-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
`;

let injected = false;

/** 注入一次全局样式（data-plugin 标记，卸载由 dsh 加载器清理同名标签）。 */
export function injectA2uiStyles(): void {
  if (injected || typeof document === "undefined") {
    return;
  }
  injected = true;
  const tag = document.createElement("style");
  tag.dataset.plugin = "@dsh-a2ui/a2ui-renderer";
  tag.textContent = A2UI_CSS;
  document.head.appendChild(tag);
}
