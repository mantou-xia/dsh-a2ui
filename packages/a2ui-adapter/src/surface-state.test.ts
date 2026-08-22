import { describe, expect, it } from "vitest";
import type { A2uiComponent } from "@dsh-a2ui/a2ui-protocol";
import { A2uiSurfaceStateStore, mergeA2uiSurface, type A2uiCreateSurfaceEnvelope } from "./surface-state.js";

function surface(components: Record<string, unknown>[]): A2uiCreateSurfaceEnvelope {
  return {
    version: "v0.9.1",
    createSurface: { surfaceId: "report-1", catalogId: "dsh-basic", components: components as A2uiComponent[] },
  };
}

describe("A2uiSurfaceStateStore", () => {
  const previous = surface([
    { id: "root", component: "grid", columns: 1, children: ["sales"] },
    { id: "sales", component: "chart", kind: "line", labels: ["一月", "二月"], series: { 销售额: [10, 20] } },
  ]);

  it("preserves omitted chart data when a stable surface is redrawn", () => {
    const incoming = surface([
      { id: "root", component: "grid", columns: 1, children: ["sales"] },
      { id: "sales", component: "chart", kind: "line", title: "更新后的趋势" },
    ]);
    const merged = mergeA2uiSurface(previous, incoming);
    expect(merged.createSurface.components?.[1]).toMatchObject({
      labels: ["一月", "二月"],
      series: { 销售额: [10, 20] },
      title: "更新后的趋势",
    });
  });

  it("keeps an explicit empty series so the model can intentionally clear a chart", () => {
    const incoming = surface([
      { id: "root", component: "grid", columns: 1, children: ["sales"] },
      { id: "sales", component: "chart", kind: "line", series: {} },
    ]);
    const merged = mergeA2uiSurface(previous, incoming);
    expect(merged.createSurface.components?.[1]?.["series"]).toEqual({});
    expect(merged.createSurface.components?.[1]?.["labels"]).toEqual(["一月", "二月"]);
  });

  it("restores the latest durable meta after a session resume", () => {
    const store = new A2uiSurfaceStateStore();
    const agent = {
      session: {
        events: [{
          type: "tool/result",
          data: { meta: { kind: "a2ui-surface", document: JSON.stringify(previous) } },
        }],
      },
    };
    const incoming = surface([
      { id: "root", component: "grid", columns: 1, children: ["sales"] },
      { id: "sales", component: "chart", kind: "line" },
    ]);
    expect(store.merge(agent, incoming).createSurface.components?.[1]?.["series"]).toEqual({ 销售额: [10, 20] });
  });

  it("does not leak a surface snapshot across agent sessions", () => {
    const store = new A2uiSurfaceStateStore();
    const first = {};
    store.merge(first, previous);
    const incoming = surface([
      { id: "root", component: "grid", columns: 1, children: ["sales"] },
      { id: "sales", component: "chart", kind: "line" },
    ]);
    expect(store.merge({}, incoming).createSurface.components?.[1]?.["series"]).toBeUndefined();
  });
});
