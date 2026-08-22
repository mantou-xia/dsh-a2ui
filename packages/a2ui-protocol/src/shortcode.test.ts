import { describe, expect, it } from "vitest";
import { A2UI_VERSION, extractA2uiBlocks, parseA2uiBlock } from "./index.js";

const block = JSON.stringify({
  version: A2UI_VERSION,
  createSurface: {
    surfaceId: "s-1",
    catalogId: "dsh-basic",
    components: [{ id: "root", component: "stat", label: "温度", value: "36.5" }],
  },
});

describe("a2ui-protocol: shortcode", () => {
  it("extracts a single block", () => {
    const blocks = extractA2uiBlocks(`plain text\n[a2ui]${block}[/a2ui]\ntail`);
    expect(blocks).toEqual([block]);
  });

  it("extracts multiple blocks", () => {
    const text = `[a2ui]${block}[/a2ui] 中间 [a2ui]${block}[/a2ui]`;
    expect(extractA2uiBlocks(text)).toEqual([block, block]);
  });

  it("stops at an unclosed trailing open tag (streaming semantics)", () => {
    expect(extractA2uiBlocks(`[a2ui]${block}`)).toEqual([]);
    expect(extractA2uiBlocks(`[a2ui]partial`)).toEqual([]);
  });

  it("treats a nested open as block content (first close closes the outer block)", () => {
    expect(extractA2uiBlocks(`[a2ui]partial [a2ui]${block}[/a2ui]`)).toEqual([`partial [a2ui]${block}`]);
  });

  it("is non-greedy on the first closing tag", () => {
    const blocks = extractA2uiBlocks(`[a2ui]{[/a2ui]x[/a2ui]`);
    expect(blocks).toEqual(["{"]);
  });

  it("returns empty for text without blocks", () => {
    expect(extractA2uiBlocks("nothing here")).toEqual([]);
    expect(extractA2uiBlocks("")).toEqual([]);
  });

  it("parses a valid block and rejects malformed JSON or non-envelope", () => {
    expect(parseA2uiBlock(block)).not.toBeNull();
    expect(parseA2uiBlock("{not json")).toBeNull();
    expect(parseA2uiBlock(JSON.stringify({ hello: "world" }))).toBeNull();
  });
});
