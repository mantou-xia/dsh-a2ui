import { describe, expect, it } from "vitest";
import { createChartOption } from "./EchartsView.tsx";

describe("createChartOption", () => {
  it("maps the active DSH color scheme into ECharts text and axis colors", () => {
    const light = createChartOption("line", ["Jan"], [{ name: "Sales", values: [10] }], "light");
    const dark = createChartOption("line", ["Jan"], [{ name: "Sales", values: [10] }], "dark");

    expect(light).toMatchObject({
      tooltip: { textStyle: { color: "#303133" } },
      xAxis: { axisLabel: { color: "#303133" }, axisLine: { lineStyle: { color: "#d9d9d9" } } },
    });
    expect(dark).toMatchObject({
      tooltip: { textStyle: { color: "#e6e6e6" } },
      xAxis: { axisLabel: { color: "#e6e6e6" }, axisLine: { lineStyle: { color: "#5a5a5a" } } },
    });
  });

  it("uses the same theme-aware text color for donut legends", () => {
    expect(createChartOption("donut", [], [{ name: "Sales", values: [10] }], "dark")).toMatchObject({
      legend: { textStyle: { color: "#e6e6e6" } },
    });
  });
});
