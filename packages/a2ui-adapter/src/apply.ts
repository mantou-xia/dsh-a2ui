/**
 * a2ui-adapter apply —— 插件激活逻辑。
 *
 * 两项职责：
 *   1. 注册 A2UI 教学段（教模型通过 a2ui_render 工具输出 A2UI，UI 原位内嵌）；
 *   2. 注册 `a2ui_render` 工具（校验/修复 A2UI document → tool/result.meta）。
 */

import type { Context } from "@deepseek-ai/cordis";
import { A2UI_LIFECYCLE_TEACHING } from "./lifecycle-teaching.js";
import { A2UI_TEACHING } from "./teaching.js";
import { assertA2uiHostCapabilities } from "./runtime.js";
import { applyA2uiTool } from "./tool.js";

/** A2UI 教学段名与顺序（顺序约定：100–199 为工具/协议指引）。 */
export const A2UI_SECTION_NAME = "a2ui" as const;
export const A2UI_SECTION_ORDER = 130 as const;

/** 图表的唯一首选数据格式；放在既有教学文本之前，避免模型遗漏 series。 */
const A2UI_CHART_TEACHING = `## Chart data contract (mandatory)

Every \`chart\` must include non-empty \`series\`. Prefer this exact canonical shape:

\`\`\`json
{"id":"sales-chart","component":"chart","kind":"line","labels":["Jan","Feb"],"series":{"Sales":[120,150]}}
\`\`\`

The catalog also accepts \`[{"name":"Sales","values":[120,150]}]\` or \`[{"label":"Jan","value":120}]\` for \`series\`; never omit \`series\` while rendering a chart.
`;

export function apply(ctx: Context, config: { teaching?: boolean } | undefined): void {
  assertA2uiHostCapabilities(ctx);
  if (config?.teaching !== false) {
    ctx.systemPrompt.section({
      name: A2UI_SECTION_NAME,
      order: A2UI_SECTION_ORDER,
      text: `${A2UI_CHART_TEACHING}\n${A2UI_TEACHING}\n${A2UI_LIFECYCLE_TEACHING}`,
    });
  }
  applyA2uiTool(ctx);
}
