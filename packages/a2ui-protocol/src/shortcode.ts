/**
 * a2ui-protocol shortcode —— `[a2ui]...[/a2ui]` 短代码提取与解析。
 *
 * 短代码是 MVP 的传输载体（模型直接以 assistant 文本输出），天然覆盖
 * live（assistant/chunk）+ history/replay（assistant/message）三个场景。
 * 纯函数、零依赖、可单测。
 */

import { isA2uiEnvelope } from "./protocol/messages.js";
import type { A2uiEnvelope } from "./protocol/messages.js";

export const A2UI_SHORTCODE_OPEN = "[a2ui]" as const;
export const A2UI_SHORTCODE_CLOSE = "[/a2ui]" as const;

/**
 * 提取文本中所有 `[a2ui]...[/a2ui]` 块的内部内容。
 * 非贪婪（取第一个闭合标记即结束）；支持多个块；未闭合的 open 处停止
 * （流式缓冲中未闭合块尚未完成，其后内容不再继续找）。
 */
export function extractA2uiBlocks(text: string): string[] {
  const blocks: string[] = [];
  let rest = text;
  for (;;) {
    const open = rest.indexOf(A2UI_SHORTCODE_OPEN);
    if (open === -1) {
      break;
    }
    const afterOpen = rest.slice(open + A2UI_SHORTCODE_OPEN.length);
    const close = afterOpen.indexOf(A2UI_SHORTCODE_CLOSE);
    if (close === -1) {
      break;
    }
    blocks.push(afterOpen.slice(0, close));
    rest = afterOpen.slice(close + A2UI_SHORTCODE_CLOSE.length);
  }
  return blocks;
}

/** 解析一个短代码块为 A2UI envelope；JSON 非法或非合法 envelope → null。 */
export function parseA2uiBlock(block: string): A2uiEnvelope | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(block);
  } catch {
    return null;
  }
  return isA2uiEnvelope(parsed) ? parsed : null;
}
