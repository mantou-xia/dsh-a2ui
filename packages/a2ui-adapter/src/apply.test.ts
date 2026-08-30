import { describe, expect, it } from "vitest";
import type { Context } from "@deepseek-ai/cordis";
import { apply, A2UI_SECTION_NAME, A2UI_SECTION_ORDER } from "./apply.js";
import { A2UI_TEACHING } from "./teaching.js";
import { A2UI_TOOL_NAME } from "./tool.js";
import type { A2uiCatalogRegistry } from "@dsh-plugin-edu/a2ui-protocol";

/** 最小 ctx mock（仅暴露 apply 用到的面）。 */
function mockCtx(
  sections: Array<{ name: string; order: number; text: string }>,
  tools: Array<{ name: string }>,
): Context {
  return {
    effect(effect: () => () => void) {
      return effect();
    },
    provide(name: string, value: unknown) {
      (this as Record<string, unknown>)[name] = value;
    },
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
    expect(sections[0]?.text).toContain(A2UI_TEACHING);
    expect(sections[0]?.text).toContain("Chart data contract");
    expect(sections[0]?.text).toContain('EVERY message is a complete envelope');
    expect(sections[0]?.text).toContain('value: { "path": "/filters/month" }');
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

  it("persists a repaired multi-surface lifecycle document from the registered tool", async () => {
    const sections: Array<{ name: string; order: number; text: string }> = [];
    const tools: Array<{ name: string; execute?: (args: unknown, exec: unknown) => Promise<unknown> }> = [];
    apply(mockCtx(sections, tools as Array<{ name: string }>), { teaching: false });
    const tool = tools.find((candidate) => candidate.name === A2UI_TOOL_NAME);
    expect(tool?.execute).toBeTypeOf("function");

    const result = await tool?.execute?.({
      messages: [
        { version: "v0.9.1", createSurface: { surfaceId: "one", components: [{ id: "root", component: "stat", label: "Before" }] } },
        { version: "v0.9.1", updateComponents: { surfaceId: "one", components: [{ id: "root", component: "stat", label: "After", ignored: true }] } },
        { version: "v0.9.1", updateDataModel: { surfaceId: "one", path: "/filters/month", value: "08" } },
        { version: "v0.9.1", createSurface: { surfaceId: "two", components: [{ id: "root", component: "stat", label: "Second" }] } },
      ],
    }, { agent: {}, callId: "call-1" });

    const meta = (result as { meta: { document: string; componentNames: string[]; warningCount: number; diagnostics: Array<{ path: string }>; guardStats: { droppedPropertyCount: number } } }).meta;
    expect(meta.document.split("\n")).toHaveLength(4);
    expect(meta.document).toContain('"label":"After"');
    expect(meta.document).not.toContain("ignored");
    expect(meta.componentNames).toEqual(["stat"]);
    expect(meta.warningCount).toBe(1);
    expect(meta.diagnostics).toContainEqual(expect.objectContaining({ path: "messages[1].updateComponents.components[0].ignored" }));
    expect(meta.guardStats.droppedPropertyCount).toBe(1);
  });

  it("reports the exact lifecycle envelope whose version is missing", async () => {
    const sections: Array<{ name: string; order: number; text: string }> = [];
    const tools: Array<{ name: string; execute?: (args: unknown, exec: unknown) => Promise<unknown> }> = [];
    apply(mockCtx(sections, tools as Array<{ name: string }>), { teaching: false });
    const tool = tools.find((candidate) => candidate.name === A2UI_TOOL_NAME);

    await expect(tool?.execute?.({
      messages: [
        { version: "v0.9.1", createSurface: { surfaceId: "one", components: [{ id: "root", component: "stat", label: "Before" }] } },
        { updateDataModel: { surfaceId: "one", path: "/filters/month", value: "08" } },
      ],
    }, { agent: {}, callId: "call-invalid" })).rejects.toThrow(
      'messages[1].version must be exactly "v0.9.1"',
    );
  });

  it("uses catalog libraries registered after the adapter tool is created", async () => {
    const sections: Array<{ name: string; order: number; text: string }> = [];
    const tools: Array<{ name: string; execute?: (args: unknown, exec: unknown) => Promise<unknown> }> = [];
    const ctx = mockCtx(sections, tools as Array<{ name: string }>) as Context & { a2uiCatalogs: A2uiCatalogRegistry };
    apply(ctx, { teaching: false });
    const dispose = ctx.a2uiCatalogs.register({
      catalog: {
        catalogId: "dsh-example",
        components: [{ component: "notice", properties: [{ name: "body", type: "string" }], limits: { maxStringLength: 100 } }],
      },
    });
    const tool = tools.find((candidate) => candidate.name === A2UI_TOOL_NAME);

    const result = await tool?.execute?.({
      messages: [{
        version: "v0.9.1",
        createSurface: { surfaceId: "example", catalogId: "dsh-example", components: [{ id: "root", component: "notice", body: "Ready" }] },
      }],
    }, { agent: {}, callId: "call-example" });

    expect((result as { componentNames: string[] }).componentNames).toEqual(["notice"]);
    dispose();
  });
});
