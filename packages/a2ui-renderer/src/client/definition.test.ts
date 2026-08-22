import { describe, expect, it } from "vitest";
import { snapshotsFromDocument } from "./definition.ts";

describe("a2ui definition document replay", () => {
  it("replays multi-surface documents with updates and deletion", () => {
    const document = [
      { version: "v0.9.1", createSurface: { surfaceId: "one", components: [{ id: "root", component: "card", body: "old" }] } },
      { version: "v0.9.1", createSurface: { surfaceId: "two", components: [{ id: "root", component: "stat", value: "2" }] } },
      { version: "v0.9.1", updateComponents: { surfaceId: "one", components: [{ id: "root", component: "card", body: "new" }] } },
      { version: "v0.9.1", updateDataModel: { surfaceId: "one", path: "/filters/month", value: "08" } },
      { version: "v0.9.1", deleteSurface: { surfaceId: "two" } },
    ].map((message) => JSON.stringify(message)).join("\n");
    const snapshots = snapshotsFromDocument(document);
    expect([...snapshots.keys()]).toEqual(["one"]);
    expect(snapshots.get("one")?.components[0]?.["body"]).toBe("new");
    expect(snapshots.get("one")?.dataModel).toEqual({ filters: { month: "08" } });
  });
});
