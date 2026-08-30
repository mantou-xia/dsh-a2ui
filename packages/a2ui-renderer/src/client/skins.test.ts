// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { getA2uiSkin, setA2uiSkin, subscribeA2uiSkin } from "./skins.ts";

afterEach(() => {
  localStorage.clear();
  setA2uiSkin("studio");
});

describe("A2UI canvas skins", () => {
  it("publishes and persists the selected skin", () => {
    let changes = 0;
    const dispose = subscribeA2uiSkin(() => { changes += 1; });
    setA2uiSkin("soft");
    expect(getA2uiSkin()).toBe("soft");
    expect(localStorage.getItem("dsh.a2ui.skin")).toBe("soft");
    expect(changes).toBe(1);
    dispose();
  });
});
