/**
 * a2ui-adapter —— Cordis 插件入口。
 *
 * 职责：注册 `a2ui_render` 工具（模型以工具调用输出 A2UI，UI 原位内嵌，
 * 无原始 JSON 文本泄露）+ 注入 A2UI 教学段。工具依赖 @deepseek-ai/dsh-tools
 * 由宿主提供（peerDependencies）。
 */

import { apply } from "./apply.js";
import { A2UI_TEACHING } from "./teaching.js";
import { A2UI_TOOL_NAME, A2UI_META_KIND } from "./tool.js";
import { provideA2uiCatalogs, registerA2uiCatalog } from "./catalog-registry.js";

/** Stable Cordis plugin name。 */
export const name = "dsh-a2ui";

/** 依赖的服务（tools 注册表 + systemPrompt 教学段）。 */
export const inject = ["tools", "systemPrompt"];

/** Plugin config（无 schema 校验；缺省行为与 { teaching: true } 等价）。 */
export interface Config {
  /** 是否注册 A2UI 教学段（默认 true）。 */
  teaching?: boolean;
}

export type A2uiAdapterConfig = Config;

export {
  apply,
  A2UI_TEACHING,
  A2UI_TOOL_NAME,
  A2UI_META_KIND,
  provideA2uiCatalogs,
  registerA2uiCatalog,
};
export type { A2uiCatalogRegistration } from "@dsh-a2ui/a2ui-protocol";
