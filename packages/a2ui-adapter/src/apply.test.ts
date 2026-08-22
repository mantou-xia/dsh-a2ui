import { describe, expect, it } from "vitest";
import type { Context } from "@deepseek-ai/cordis";
import { apply, A2UI_SECTION_NAME, A2UI_SECTION_ORDER } from "./apply.js";
import { A2UI_TEACHING } from "./teaching.js";
import { A2UI_TOOL_NAME } from "./tool.js";

/** 最小 ctx mock（仅暴露 apply 用到的面）。 */
function mockCtx(
  sections: Array<{ name: string; order: number; text: string }>,
  tools: Array<{ name: string }>,
): Context {
  return {
    systemPrompt: {
      section(section: { name: string; order: number; text: string }) {
        sections.push(section);
        return () => true;
      },
    },
    tools: {
      register(tool: { name: string }) {
        tools.push(tool);
        return () => true;
      },
    },
  } as unknown as Context;
}

describe("a2ui-adapter", () => {
  it("registers the a2ui teaching section and the a2ui_render tool when enabled", () => {
    const sections: Array<{ name: string; order: number; text: string }> = [];
    const tools: Array<{ name: string }> = [];
    apply(mockCtx(sections, tools), { teaching: true });
    expect(sections).toHaveLength(1);
    expect(sections[0]?.name).toBe(A2UI_SECTION_NAME);
    expect(sections[0]?.order).toBe(A2UI_SECTION_ORDER);
    expect(sections[0]?.text).toBe(A2UI_TEACHING);
    expect(tools.map((tool) => tool.name)).toContain(A2UI_TOOL_NAME);
  });

  it("skips the teaching section but still registers the tool when teaching is disabled", () => {
    const sections: Array<{ name: string; order: number; text: string }> = [];
    const tools: Array<{ name: string }> = [];
    apply(mockCtx(sections, tools), { teaching: false });
    expect(sections).toHaveLength(0);
    expect(tools.map((tool) => tool.name)).toContain(A2UI_TOOL_NAME);
  });

  it("teaching covers the dsh-basic catalog and the tool-first authoring rule", () => {
    for (const component of ["stat", "table", "chart", "card", "grid", "callout", "button", "form", "input", "select"]) {
      expect(A2UI_TEACHING).toContain(component);
    }
    expect(A2UI_TEACHING).toContain("a2ui_render");
    expect(A2UI_TEACHING).toContain("catalogId");
    expect(A2UI_TEACHING).toContain("ui_action");
  });
});
