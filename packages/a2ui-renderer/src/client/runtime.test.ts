import { describe, expect, it } from "vitest";
import { assertA2uiClientCapabilities } from "./runtime.ts";

describe("a2ui renderer runtime compatibility", () => {
  it("accepts the required client services", () => {
    expect(() => assertA2uiClientCapabilities({
      conversationEvents: { register() {} },
      slots: { inject() {}, register() {} },
      sessions: { scope() {} },
      theme: { getTheme() {} },
      workspaces: { pickDirectory() {} },
    })).not.toThrow();
  });

  it("reports every missing client capability", () => {
    expect(() => assertA2uiClientCapabilities({})).toThrow("conversationEvents.register");
    expect(() => assertA2uiClientCapabilities({})).toThrow("theme.getTheme");
  });
});
