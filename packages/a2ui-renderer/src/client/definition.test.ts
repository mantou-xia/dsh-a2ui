import { describe, expect, it } from "vitest";
import type { A2uiChatData } from "./chat-data.ts";
import { buildA2uiViewNode, snapshotsFromArguments, snapshotsFromDocument, updateArgumentPreviewCache } from "./definition.ts";

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

  it("renders the first complete envelope before the streamed arguments JSON closes", () => {
    const argsPrefix = JSON.stringify({
      messages: [{
        version: "v0.9.1",
        createSurface: {
          surfaceId: "streamed",
          components: [{ id: "root", component: "stat", label: "Loading", value: "1" }],
        },
      }],
    }).slice(0, -2);
    const snapshots = snapshotsFromArguments(`${argsPrefix}, {"version":"v0.9.1","updateDataModel":`);
    expect([...snapshots.keys()]).toEqual(["streamed"]);
    expect(snapshots.get("streamed")?.components[0]?.["label"]).toBe("Loading");
  });

  it("uses the complete arguments document once streaming finishes", () => {
    const snapshots = snapshotsFromArguments(JSON.stringify({
      messages: [
        { version: "v0.9.1", createSurface: { surfaceId: "streamed", components: [{ id: "root", component: "stat", label: "Before" }] } },
        { version: "v0.9.1", updateComponents: { surfaceId: "streamed", components: [{ id: "root", component: "stat", label: "After" }] } },
      ],
    }));
    expect(snapshots.get("streamed")?.components[0]?.["label"]).toBe("After");
  });

  it("incrementally applies only newly completed lifecycle envelopes", () => {
    const first = JSON.stringify({
      messages: [{ version: "v0.9.1", createSurface: { surfaceId: "streamed", components: [{ id: "root", component: "stat", label: "Before" }] } }],
    }).slice(0, -2);
    const firstCache = updateArgumentPreviewCache(null, `${first}, {"version":"v0.9.1","updateComponents":`);
    expect(firstCache?.snapshots.get("streamed")?.components[0]?.["label"]).toBe("Before");

    const completed = JSON.stringify({
      messages: [
        { version: "v0.9.1", createSurface: { surfaceId: "streamed", components: [{ id: "root", component: "stat", label: "Before" }] } },
        { version: "v0.9.1", updateComponents: { surfaceId: "streamed", components: [{ id: "root", component: "stat", label: "After" }] } },
      ],
    });
    const secondCache = updateArgumentPreviewCache(firstCache, completed);
    expect(secondCache?.snapshots.get("streamed")?.components[0]?.["label"]).toBe("After");
    expect(secondCache?.acceptedMessageCount).toBe(2);
    expect(updateArgumentPreviewCache(secondCache ?? null, `${completed} trailing partial`)).toBe(secondCache);
  });

  it("keeps an anchored node materialized as hidden while no preview is available", () => {
    const node = buildA2uiViewNode({
      key: "a2ui:test",
      id: "1:1",
      state: {
        renderIndex: 0,
        surfaceId: "call-1",
        argsRaw: "{",
        settled: null,
        preview: null,
        previewCache: null,
        anchorSeq: 12,
        location: { kind: "unresolved" },
      },
      start: null,
    } as unknown as Parameters<typeof buildA2uiViewNode>[0]);
    expect(node).toMatchObject({ key: "a2ui:test", visibility: "hidden", anchorSeq: 12 });
    expect(node).not.toBeNull();
    if (node === null) throw new Error("expected an anchored hidden node");
    expect((node.data as A2uiChatData).surfaces.size).toBe(0);
  });

  it("does not materialize a node before an a2ui tool call is anchored", () => {
    const node = buildA2uiViewNode({
      key: "a2ui:test",
      id: "1:1",
      state: {
        renderIndex: null,
        surfaceId: null,
        argsRaw: "",
        settled: null,
        preview: null,
        previewCache: null,
        anchorSeq: null,
        location: null,
      },
      start: null,
    } as unknown as Parameters<typeof buildA2uiViewNode>[0]);
    expect(node).toBeNull();
  });
});
