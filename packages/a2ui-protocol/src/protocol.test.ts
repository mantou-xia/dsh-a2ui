import { describe, expect, it } from "vitest";
import {
  A2UI_VERSION,
  buildCreateSurface,
  envelopeKind,
  isA2uiEnvelope,
  readCreateSurface,
} from "./index.js";

describe("a2ui-protocol: protocol/messages", () => {
  it("recognizes all six official message kinds", () => {
    expect(envelopeKind({ version: A2UI_VERSION, createSurface: { surfaceId: "s" } })).toBe("createSurface");
    expect(envelopeKind({ version: A2UI_VERSION, updateComponents: { surfaceId: "s", components: [] } })).toBe("updateComponents");
    expect(envelopeKind({ version: A2UI_VERSION, updateDataModel: { surfaceId: "s" } })).toBe("updateDataModel");
    expect(envelopeKind({ version: A2UI_VERSION, deleteSurface: { surfaceId: "s" } })).toBe("deleteSurface");
    expect(envelopeKind({ version: A2UI_VERSION, action: { name: "click", surfaceId: "s" } })).toBe("action");
    expect(envelopeKind({ version: A2UI_VERSION, error: { code: "X", message: "m" } })).toBe("error");
  });

  it("rejects non-objects and multiple kinds; isA2uiEnvelope checks version", () => {
    expect(envelopeKind(null)).toBeUndefined();
    expect(envelopeKind("a2ui")).toBeUndefined();
    // envelopeKind 只读消息 kind，不校验 version。
    expect(envelopeKind({ version: "v0.9.0", createSurface: { surfaceId: "s" } })).toBe("createSurface");
    expect(isA2uiEnvelope({ version: "v0.9.0", createSurface: { surfaceId: "s" } })).toBe(false);
    expect(isA2uiEnvelope({ version: A2UI_VERSION, createSurface: { surfaceId: "s" }, action: { name: "x", surfaceId: "s" } })).toBe(false);
  });

  it("buildCreateSurface produces a valid createSurface envelope", () => {
    const envelope = buildCreateSurface({ surfaceId: "s-1", components: [] });
    expect(isA2uiEnvelope(envelope)).toBe(true);
    expect(readCreateSurface(envelope)).toEqual({ surfaceId: "s-1", components: [] });
    expect(readCreateSurface(buildCreateSurface({ surfaceId: "s-2" }))).toEqual({ surfaceId: "s-2" });
  });

  it("readCreateSurface returns null for non-createSurface kinds", () => {
    expect(readCreateSurface({ version: A2UI_VERSION, deleteSurface: { surfaceId: "s" } })).toBeNull();
  });
});
