import { describe, expect, it } from "vitest";
import { A2UI_LIMITS, DSH_BASIC_CATALOG_ID, repairA2uiEnvelope } from "./index.js";

/** 测试用的宽松 createSurface 视图（repair 返回类型收窄）。 */
type TestCreateSurface = {
  createSurface: { catalogId?: string; components: Array<Record<string, unknown>> };
};

const createSurface = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  version: "v0.9.1",
  createSurface: { surfaceId: "s-1", components: [{ id: "root", component: "stat", label: "温度", value: "36.5" }], ...overrides },
});

describe("a2ui-protocol: guard", () => {
  it("returns null for non-envelope / wrong version / non-createSurface inputs", () => {
    expect(repairA2uiEnvelope(null)).toBeNull();
    expect(repairA2uiEnvelope("x")).toBeNull();
    expect(repairA2uiEnvelope({ version: "v0.9.0", createSurface: {} })).toBeNull();
    expect(repairA2uiEnvelope({ version: "v0.9.1", deleteSurface: { surfaceId: "s" } })).toBeNull();
    expect(repairA2uiEnvelope({ version: "v0.9.1" })).toBeNull();
  });

  it("returns null when surfaceId is missing or empty", () => {
    expect(repairA2uiEnvelope(createSurface({ surfaceId: "" }))).toBeNull();
    expect(repairA2uiEnvelope(createSurface({}))).not.toBeNull();
  });

  it("returns null for unknown catalogId (no semantic guessing)", () => {
    expect(repairA2uiEnvelope(createSurface({ catalogId: "official-basic" }))).toBeNull();
  });

  it("normalizes missing catalogId to dsh-basic and keeps whitelisted props", () => {
    const repaired = repairA2uiEnvelope(createSurface());
    expect(repaired).not.toBeNull();
    const cs = (repaired as TestCreateSurface).createSurface;
    expect(cs.catalogId).toBe(DSH_BASIC_CATALOG_ID);
    expect(cs.components[0]?.label).toBe("温度");
  });

  it("drops unknown component types and non-whitelisted properties", () => {
    const repaired = repairA2uiEnvelope(createSurface({
      components: [
        { id: "root", component: "stat", label: "温度", value: "36.5" },
        { id: "bad-1", component: "password", properties: {} },
        { id: "bad-2", component: "stat", label: "脏数据", evil: "<script>" },
      ],
    }));
    expect(repaired).not.toBeNull();
    const cs = (repaired as TestCreateSurface).createSurface;
    // root 可达；bad-2 是孤岛（未挂 children 引用），BFS 后一并丢弃。
    expect(cs.components).toHaveLength(1);
    expect(cs.components[0]?.id).toBe("root");
    expect(cs.components[0]?.["evil"]).toBeUndefined();
  });

  it("requires a root component; drops the whole surface without one", () => {
    expect(repairA2uiEnvelope(createSurface({
      components: [{ id: "stat-1", component: "stat", label: "温度" }],
    }))).toBeNull();
  });

  it("truncates oversized strings and clamps numbers", () => {
    const repaired = repairA2uiEnvelope(createSurface({
      components: [
        { id: "root", component: "grid", columns: 3.7, children: ["g-1"] },
        { id: "g-1", component: "stat", label: "x".repeat(500) },
      ],
    }));
    expect(repaired).not.toBeNull();
    const cs = (repaired as TestCreateSurface).createSurface;
    expect(String(cs.components[1]?.["label"]).length).toBe(200);
    expect(cs.components[0]?.["columns"]).toBe(4);
  });

  it("caps component count at maxComponents (input sliced, reachable kept)", () => {
    // root + 204 个 stat 子组件（输入 205 个）→ slice 到 200 →
    // root + c-0..c-198 在数组中；root.children 引用截断后前 200 个 id，
    // c-199 不在数组被跳过 → 可达恰好 200 个。
    const childIds = Array.from({ length: A2UI_LIMITS.maxComponents + 5 }, (_, i) => `c-${i}`);
    const components = [
      { id: "root", component: "card", title: "root", body: "x", children: childIds },
      ...childIds.map((id) => ({ id, component: "stat", label: "t", value: "1" })),
    ];
    const repaired = repairA2uiEnvelope(createSurface({ components }));
    expect(repaired).not.toBeNull();
    const cs = (repaired as TestCreateSurface).createSurface;
    expect(cs.components).toHaveLength(A2UI_LIMITS.maxComponents);
  });

  it("drops unreachable (island) components and resolves children references", () => {
    const repaired = repairA2uiEnvelope(createSurface({
      components: [
        { id: "root", component: "grid", columns: 2, children: ["stat-1", "ghost"] },
        { id: "stat-1", component: "stat", label: "可达", value: "1" },
        { id: "island", component: "stat", label: "孤岛", value: "2" },
      ],
    }));
    expect(repaired).not.toBeNull();
    const cs = (repaired as TestCreateSurface).createSurface;
    const ids = cs.components.map((c) => c.id);
    expect(ids).toEqual(["root", "stat-1"]);
  });

  it("cuts cycles via visited set and enforces maxDepth", () => {
    const selfLoop = createSurface({
      components: [
        { id: "root", component: "grid", columns: 2, children: ["a"] },
        { id: "a", component: "grid", columns: 1, children: ["a"] },
      ],
    });
    expect(repairA2uiEnvelope(selfLoop)).not.toBeNull();

    // 深度链 root→a→b→c（maxDepth=8 内）可保留。
    const deep = createSurface({
      components: [
        { id: "root", component: "grid", columns: 1, children: ["a"] },
        { id: "a", component: "grid", columns: 1, children: ["b"] },
        { id: "b", component: "grid", columns: 1, children: ["c"] },
        { id: "c", component: "stat", label: "最深处", value: "1" },
      ],
    });
    const repairedDeep = repairA2uiEnvelope(deep);
    expect(repairedDeep).not.toBeNull();
    const csDeep = (repairedDeep as TestCreateSurface).createSurface;
    expect(csDeep.components.map((c) => c.id)).toEqual(["root", "a", "b", "c"]);
  });

  it("does NOT semantically repair object cells in string[] (drops them instead)", () => {
    const repaired = repairA2uiEnvelope(createSurface({
      components: [
        {
          id: "root",
          component: "table",
          title: "月度明细",
          columns: [{ key: "month", label: "月份" }, { key: "sales", label: "销售额" }],
          rows: [],
        },
      ],
    }));
    expect(repaired).not.toBeNull();
    const cs = (repaired as TestCreateSurface).createSurface;
    // 对象列被整体丢弃（不猜 label），columns 字段缺失。
    expect(cs.components[0]?.["columns"]).toBeUndefined();
  });

  it("does NOT semantically repair object-form rows in string[][] (drops the row instead)", () => {
    const repaired = repairA2uiEnvelope(createSurface({
      components: [
        {
          id: "root",
          component: "table",
          title: "月度明细",
          columns: ["月份", "销售额"],
          rows: [{ month: "01月", sales: 100 }, ["02月", "42 万"]],
        },
      ],
    }));
    expect(repaired).not.toBeNull();
    const cs = (repaired as TestCreateSurface).createSurface;
    expect(cs.components[0]?.["rows"]).toEqual([["02月", "42 万"]]);
  });

  it("normalizes documented chart-series array forms so the first render has data", () => {
    const repaired = repairA2uiEnvelope(createSurface({
      components: [{
        id: "root", component: "chart", kind: "line",
        series: [{ label: "一月", value: 120 }, { label: "二月", value: 150 }],
      }],
    }));
    const chart = (repaired as TestCreateSurface).createSurface.components[0];
    expect(chart?.["labels"]).toEqual(["一月", "二月"]);
    expect(chart?.["series"]).toEqual({ value: [120, 150] });
  });

  it("normalizes named series data arrays without changing explicit labels", () => {
    const repaired = repairA2uiEnvelope(createSurface({
      components: [{
        id: "root", component: "chart", labels: ["一月", "二月"],
        series: [{ name: "销售额", data: [120, 150] }],
      }],
    }));
    const chart = (repaired as TestCreateSurface).createSurface.components[0];
    expect(chart?.["labels"]).toEqual(["一月", "二月"]);
    expect(chart?.["series"]).toEqual({ 销售额: [120, 150] });
  });

  it("repair is idempotent", () => {
    const input = createSurface({
      components: [
        { id: "root", component: "stat", label: "温度", value: "36.5" },
        { id: "bad", component: "password" },
      ],
    });
    const first = repairA2uiEnvelope(input);
    const second = repairA2uiEnvelope(first);
    expect(second).toEqual(first);
  });
});
