import { describe, expect, it } from "vitest";
import { assertA2uiHostCapabilities } from "./runtime.ts";

describe("a2ui adapter runtime compatibility", () => {
  it("accepts the required host services", () => {
    expect(() => assertA2uiHostCapabilities({
      tools: { register() {} },
      systemPrompt: { section() {} },
    })).not.toThrow();
  });

  it("reports each missing host capability", () => {
    expect(() => assertA2uiHostCapabilities({ tools: {} })).toThrow("tools.register, systemPrompt.section");
  });
});
