// @vitest-environment jsdom
/** P2 自动化验收：流式工具参数 -> 生命周期归约 -> React/ECharts/交互。 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { A2uiSurfaceSnapshot } from "@dsh-plugin-edu/a2ui-protocol";
import type { A2uiChatData } from "./chat-data.ts";
import { snapshotsFromArguments, snapshotsFromDocument } from "./definition.ts";
import type { UiAction } from "./dispatch.ts";
import { A2uiNodeView, type A2uiNodeProps } from "./components/A2uiNodeView.tsx";

const echarts = vi.hoisted(() => {
  const chart = { dispose: vi.fn(), resize: vi.fn(), setOption: vi.fn() };
  return { chart, init: vi.fn(() => chart), use: vi.fn() };
});

vi.mock("echarts/core", () => echarts);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function chatData(snapshots: ReadonlyMap<string, A2uiSurfaceSnapshot>): A2uiChatData {
  return {
    surfaces: new Map([...snapshots.values()].map((snapshot, index) => [
      snapshot.surfaceId,
      { surfaceId: snapshot.surfaceId, snapshot, seq: index + 1 },
    ])),
  };
}

function view(data: A2uiChatData, sendAction: (action: UiAction) => void) {
  const node = {
    key: "p2-flow",
    kind: "a2ui",
    id: "p2-flow",
    target: "chat",
    anchorSeq: 1,
    location: { kind: "unresolved" },
    visibility: "visible",
    data,
  };
  return <A2uiNodeView {...({ node, sendAction, colorScheme: "light" } as unknown as A2uiNodeProps)} />;
}

describe("P2 A2UI complete flow", () => {
  it("renders a streamed preview, then applies lifecycle/data-model updates and dispatches actions", () => {
    const messages = [
      {
        version: "v0.9.1",
        createSurface: {
          surfaceId: "p2-main",
          components: [
            { id: "root", component: "grid", columns: 2, children: ["stat-1", "chart-1", "form-1", "button-1"] },
            { id: "stat-1", component: "stat", label: "状态", value: "初始" },
            { id: "chart-1", component: "chart", title: "月度销售", kind: "bars", labels: ["一月", "二月"], series: { 销售额: [120, 150] } },
            { id: "form-1", component: "form", submitAction: { name: "query" }, children: ["month"] },
            { id: "month", component: "input", label: "月份", placeholder: "月份", value: { path: "/filters/month" } },
            { id: "button-1", component: "button", label: "刷新数据", action: { name: "refresh", payload: { force: true } } },
          ],
        },
      },
      { version: "v0.9.1", updateDataModel: { surfaceId: "p2-main", path: "/filters/month", value: "08" } },
      { version: "v0.9.1", updateComponents: { surfaceId: "p2-main", components: [{ id: "stat-1", component: "stat", label: "状态", value: "组件已更新" }] } },
      { version: "v0.9.1", createSurface: { surfaceId: "p2-secondary", components: [{ id: "root", component: "stat", label: "P2第二个Surface", value: "正常" }] } },
    ];

    const completeArguments = JSON.stringify({ messages });
    const secondMessageStart = completeArguments.indexOf(JSON.stringify(messages[1]));
    const streamedArguments = completeArguments.slice(0, secondMessageStart + 35);
    const preview = snapshotsFromArguments(streamedArguments);
    const actions: UiAction[] = [];
    const sendAction = (action: UiAction) => actions.push(action);
    const rendered = render(view(chatData(preview), sendAction));

    expect(screen.getByText("初始")).not.toBeNull();
    expect(screen.getByRole("img", { name: /月度销售。横轴为一月、二月。数据为销售额：120、150。/ })).not.toBeNull();
    expect(echarts.init).toHaveBeenCalledTimes(1);

    const document = messages.map((message) => JSON.stringify(message)).join("\n");
    const settled = snapshotsFromDocument(document);
    rendered.rerender(view(chatData(settled), sendAction));

    expect(screen.getByText("组件已更新")).not.toBeNull();
    expect(screen.getByText("P2第二个Surface")).not.toBeNull();
    expect((screen.getByPlaceholderText("月份") as HTMLInputElement).value).toBe("08");

    fireEvent.click(screen.getByText("刷新数据"));
    fireEvent.click(screen.getByText("query"));
    expect(actions).toEqual([
      { surfaceId: "p2-main", name: "refresh", component: "button-1", context: { force: true } },
      { surfaceId: "p2-main", name: "query", component: "form-1", context: { values: { month: "08" } } },
    ]);
  });
});
