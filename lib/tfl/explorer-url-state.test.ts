import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_EXPLORER_STATE,
  EXPLORER_PATH,
  buildExplorerHref,
  domainsForKind,
  parseExplorerState,
} from "./explorer-url-state";

describe("parseExplorerState", () => {
  it("returns defaults for empty params", () => {
    assert.deepEqual(parseExplorerState({}), {
      ...DEFAULT_EXPLORER_STATE,
      id: undefined,
      q: undefined,
    });
  });

  it("falls back on invalid kind", () => {
    const state = parseExplorerState({ kind: "vehicles" });
    assert.equal(state.kind, "points");
  });

  it("falls back on invalid domain for points", () => {
    const state = parseExplorerState({ kind: "points", domain: "river" });
    assert.equal(state.domain, "tube-rail");
  });

  it("rejects cycle under lines", () => {
    const state = parseExplorerState({ kind: "lines", domain: "cycle" });
    assert.equal(state.kind, "lines");
    assert.equal(state.domain, "tube-rail");
  });

  it("accepts valid combinations", () => {
    const state = parseExplorerState({
      kind: "lines",
      domain: "bus",
      tab: "find",
      view: "map",
      id: "central",
      dir: "outbound",
      q: "baker",
    });
    assert.deepEqual(state, {
      kind: "lines",
      domain: "bus",
      view: "map",
      id: "central",
      dir: "outbound",
      q: "baker",
    });
  });

  it("ignores legacy tab and falls back on invalid view/dir", () => {
    const state = parseExplorerState({
      tab: "map",
      view: "browse",
      dir: "both",
    });
    assert.equal(state.view, "list");
    assert.equal(state.dir, "inbound");
  });

  it("treats empty id and q as undefined", () => {
    const state = parseExplorerState({ id: "  ", q: "" });
    assert.equal(state.id, undefined);
    assert.equal(state.q, undefined);
  });

  it("reads first value from array params", () => {
    const state = parseExplorerState({
      kind: ["lines", "points"],
      id: ["victoria"],
    });
    assert.equal(state.kind, "lines");
    assert.equal(state.id, "victoria");
  });

  it("accepts URLSearchParams and ignores tab", () => {
    const params = new URLSearchParams("kind=points&domain=bus&tab=find");
    const state = parseExplorerState(params);
    assert.equal(state.kind, "points");
    assert.equal(state.domain, "bus");
    assert.equal("tab" in state, false);
  });
});

describe("buildExplorerHref", () => {
  it("returns bare path for defaults", () => {
    assert.equal(buildExplorerHref({}), EXPLORER_PATH);
  });

  it("omits default values", () => {
    assert.equal(
      buildExplorerHref({ kind: "points", domain: "tube-rail" }),
      EXPLORER_PATH,
    );
  });

  it("includes non-default values and never emits tab", () => {
    const href = buildExplorerHref({
      kind: "lines",
      domain: "bus",
      id: "9",
      dir: "outbound",
    });
    assert.equal(
      href,
      `${EXPLORER_PATH}?kind=lines&domain=bus&dir=outbound&id=9`,
    );
    assert.ok(!href.includes("tab="));
  });

  it("clamps cycle when switching to lines", () => {
    const href = buildExplorerHref(
      { kind: "lines" },
      {
        ...DEFAULT_EXPLORER_STATE,
        kind: "points",
        domain: "cycle",
      },
    );
    assert.ok(href.includes("kind=lines"));
    assert.ok(!href.includes("domain=cycle"));
  });

  it("round-trips with parseExplorerState", () => {
    const original = {
      kind: "lines" as const,
      domain: "tube-rail" as const,
      view: "list" as const,
      id: "central",
      dir: "outbound" as const,
      q: undefined,
    };
    const href = buildExplorerHref(original);
    const url = new URL(href, "https://example.com");
    const parsed = parseExplorerState(url.searchParams);
    assert.deepEqual(parsed, { ...original, q: undefined });
  });
});

describe("domainsForKind", () => {
  it("excludes cycle from lines", () => {
    assert.deepEqual(domainsForKind("lines"), ["tube-rail", "bus"]);
    assert.deepEqual(domainsForKind("points"), ["tube-rail", "bus", "cycle"]);
  });
});
