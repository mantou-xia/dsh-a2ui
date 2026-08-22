/**
 * a2ui-adapter apply —— 插件激活逻辑。
 *
 * 两项职责：
 *   1. 注册 A2UI 教学段（教模型通过 a2ui_render 工具输出 A2UI，UI 原位内嵌）；
 *   2. 注册 `a2ui_render` 工具（校验/修复 A2UI document → tool/result.meta）。
 */

import type { Context } from "@deepseek-ai/cordis";
import { A2UI_TEACHING } from "./teaching.js";
import { applyA2uiTool } from "./tool.js";

/** A2UI 教学段名与顺序（顺序约定：100–199 为工具/协议指引）。 */
export const A2UI_SECTION_NAME = "a2ui" as const;
export const A2UI_SECTION_ORDER = 130 as const;

export function apply(ctx: Context, config: { teaching?: boolean } | undefined): void {
  if (config?.teaching !== false) {
    ctx.systemPrompt.section({
      name: A2UI_SECTION_NAME,
      order: A2UI_SECTION_ORDER,
      text: A2UI_TEACHING,
    });
  }
  applyA2uiTool(ctx);
}
