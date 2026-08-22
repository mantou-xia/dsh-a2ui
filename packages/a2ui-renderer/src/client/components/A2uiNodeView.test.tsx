// @vitest-environment jsdom
/**
 * A2uiNodeView 渲染与交互测试（jsdom）：
 * 验证静态/交互组件渲染、children 引用解析、button/form 的 action 回传
 * （注入的 sendAction 收到 UiAction：surfaceId/name/component/context）。
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { A2uiSurfaceSnapshot } from "@dsh-a2ui/a2ui-protocol";
import type { A2uiChatData } from "../chat-data.ts";
import { A2uiNodeView, type A2uiNodeProps } from "./A2uiNodeView.tsx";
import type { UiAction } from "../dispatch.ts";

const echarts = vi.hoisted(() => {
  const chart = { dispose: vi.fn(), resize: vi.fn(), setOption: vi.fn() };
  return { chart, init: vi.fn(() => chart) };
});

vi.mock("echarts/dist/echarts.esm.mjs", () => echarts);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderNode(data: A2uiChatData, sendAction: (action: UiAction) => void = () => {}): ReturnType<typeof vi.fn> {
  const send = vi.fn(sendAction);
  const node = {
    key: "k-a2ui",
    kind: "a2ui",
    id: "id-a2ui",
    target: "chat",
    anchorSeq: 1,
    location: { kind: "unresolved" },
    visibility: "visible",
    data,
  };
  render(<A2uiNodeView {...({ node, sendAction: send, colorScheme: "light" } as unknown as A2uiNodeProps)} />);
  return send;
}

function surfaceData(snapshot: A2uiSurfaceSnapshot): A2uiChatData {
  return { surfaces: new Map([["report-1", { surfaceId: "report-1", snapshot, seq: 1 }]]) };
}

describe("A2uiNodeView: 静态组件渲染", () => {
  it("renders stat with value and label", () => {
    renderNode(surfaceData({
      surfaceId: "report-1",
      catalogId: "dsh-basic",
      components: [
        { id: "root", component: "grid", columns: 2, children: ["stat-1"] },
        { id: "stat-1", component: "stat", label: "总销售额", value: "128 万", unit: "元" },
      ],
    }));
    expect(screen.getByText("128 万")).not.toBeNull();
    expect(screen.getByText("总销售额")).not.toBeNull();
  });

  it("renders table with headers and rows via children resolution", () => {
    renderNode(surfaceData({
      surfaceId: "report-1",
      catalogId: "dsh-basic",
      components: [
        { id: "root", component: "grid", columns: 1, children: ["table-1"] },
        {
          id: "table-1", component: "table", title: "月度明细",
          columns: ["月份", "销售额"], rows: [["1月", "30 万"], ["2月", "42 万"]],
        },
      ],
    }));
    expect(screen.getByText("月度明细")).not.toBeNull();
    expect(screen.getByText("月份")).not.toBeNull();
    expect(screen.getByText("30 万")).not.toBeNull();
    expect(screen.getByText("2月")).not.toBeNull();
  });

  it("renders an ECharts chart container and callout", () => {
    renderNode(surfaceData({
      surfaceId: "report-1",
      catalogId: "dsh-basic",
      components: [
        { id: "root", component: "grid", columns: 2, children: ["chart-1", "callout-1"] },
        { id: "chart-1", component: "chart", title: "趋势", kind: "bars", labels: ["一", "二"], series: { 销售额: [10, 20] } },
        { id: "callout-1", component: "callout", tone: "warn", title: "注意", body: "数据仅供参考" },
      ],
    }));
    expect(screen.getByText("趋势")).not.toBeNull();
    expect(screen.getByRole("img", { name: "bars chart" })).not.toBeNull();
    expect(echarts.init).toHaveBeenCalledTimes(1);
    expect(screen.getByText("注意")).not.toBeNull();
  });
});

describe("A2uiNodeView: 交互与 action 回传", () => {
  it("sends a UiAction when a button is clicked", () => {
    const actions: UiAction[] = [];
    renderNode(surfaceData({
      surfaceId: "report-1",
      catalogId: "dsh-basic",
      components: [
        { id: "root", component: "grid", columns: 1, children: ["btn-1"] },
        { id: "btn-1", component: "button", label: "刷新数据", action: { name: "refresh", payload: { force: true } } },
      ],
    }), (action) => actions.push(action));
    fireEvent.click(screen.getByText("刷新数据"));
    expect(actions).toEqual([{
      surfaceId: "report-1",
      name: "refresh",
      component: "btn-1",
      context: { force: true },
    }]);
  });

  it("collects input/select values on form submit into context", () => {
    const actions: UiAction[] = [];
    renderNode(surfaceData({
      surfaceId: "report-1",
      catalogId: "dsh-basic",
      components: [
        { id: "root", component: "grid", columns: 1, children: ["form-1"] },
        {
          id: "form-1", component: "form", title: "查询条件",
          submitAction: { name: "query", payload: { mode: "filter" } },
          children: ["input-1", "select-1"],
        },
        { id: "input-1", component: "input", label: "关键词", placeholder: "输入关键词" },
        {
          id: "select-1", component: "select", label: "范围",
          options: [{ label: "全部", value: "all" }, { label: "本月", value: "month" }],
        },
      ],
    }), (action) => actions.push(action));
    fireEvent.change(screen.getByPlaceholderText("输入关键词"), { target: { value: "南京" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "month" } });
    fireEvent.click(screen.getByText("query"));
    expect(actions).toEqual([{
      surfaceId: "report-1",
      name: "query",
      component: "form-1",
      context: { values: { "input-1": "南京", "select-1": "month" } },
    }]);
  });

  it("disables a button without an action declaration", () => {
    renderNode(surfaceData({
      surfaceId: "report-1",
      catalogId: "dsh-basic",
      components: [
        { id: "root", component: "grid", columns: 1, children: ["btn-1"] },
        { id: "btn-1", component: "button", label: "无动作" },
      ],
    }));
    expect(screen.getByText("无动作").closest("button")?.disabled).toBe(true);
  });
});
