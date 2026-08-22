import { describe, expect, it } from "vitest";
import { A2UI_VERSION, reduceA2uiDocument } from "./index.js";

describe("a2ui-protocol: document reducer", () => {
  it("supports component updates, dataModel updates and deletion across multiple surfaces", () => {
    const surfaces = reduceA2uiDocument([
      { version: A2UI_VERSION, createSurface: { surfaceId: "one", components: [{ id: "root", component: "card", body: "before" }] } },
      { version: A2UI_VERSION, createSurface: { surfaceId: "two", components: [{ id: "root", component: "stat", value: "2" }] } },
      { version: A2UI_VERSION, updateComponents: { surfaceId: "one", components: [{ id: "root", component: "card", body: "after" }] } },
      { version: A2UI_VERSION, updateDataModel: { surfaceId: "one", path: "/filters/month", value: "08" } },
      { version: A2UI_VERSION, deleteSurface: { surfaceId: "two" } },
    ]);
    expect([...surfaces.keys()]).toEqual(["one"]);
    expect(surfaces.get("one")?.components[0]?.["body"]).toBe("after");
    expect(surfaces.get("one")?.dataModel).toEqual({ filters: { month: "08" } });
  });

  it("ignores updates before creation and removes a JSON-pointer value", () => {
    const surfaces = reduceA2uiDocument([
      { version: A2UI_VERSION, updateDataModel: { surfaceId: "missing", path: "/x", value: 1 } },
      { version: A2UI_VERSION, createSurface: { surfaceId: "one", components: [{ id: "root", component: "card" }] } },
      { version: A2UI_VERSION, updateDataModel: { surfaceId: "one", value: { keep: true, remove: true } } },
      { version: A2UI_VERSION, updateDataModel: { surfaceId: "one", path: "/remove" } },
    ]);
    expect(surfaces.get("one")?.dataModel).toEqual({ keep: true });
  });
});
