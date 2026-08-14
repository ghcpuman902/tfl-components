import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getLineColourBgClass,
  getLineColourToken,
  LINE_COLOUR_TOKENS,
} from "./line-colour-map";

describe("line colour map", () => {
  it("exports one token per published line/mode with complete class strings", () => {
    assert.ok(LINE_COLOUR_TOKENS.length > 20);
    const northern = getLineColourToken("northern");
    assert.ok(northern);
    assert.equal(northern.bgClass, "bg-tfl-line-northern");
    assert.equal(northern.textClass, "text-tfl-line-northern");
    assert.equal(getLineColourBgClass("northern"), "bg-tfl-line-northern");
  });

  it("resolves aliases to the same token", () => {
    const a = getLineColourToken("elizabeth");
    const b = getLineColourToken("elizabeth-line");
    assert.ok(a);
    assert.equal(a, b);
    assert.equal(a.cssVar, "tfl-mode-elizabeth");
  });
});
