import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mapLegacyBrowseLinesRedirect,
  mapLegacyBusStopsRedirect,
  mapLegacyRouteStationsRedirect,
} from "./explorer-legacy-redirects";
import { EXPLORER_PATH, parseExplorerState } from "./explorer-url-state";

describe("mapLegacyBrowseLinesRedirect", () => {
  it("maps to lines / tube-rail / browse", () => {
    const href = mapLegacyBrowseLinesRedirect();
    const parsed = parseExplorerState(new URL(href, "https://example.com").searchParams);
    assert.equal(parsed.kind, "lines");
    assert.equal(parsed.domain, "tube-rail");
    assert.equal(parsed.tab, "browse");
    assert.ok(href.startsWith(EXPLORER_PATH));
  });
});

describe("mapLegacyRouteStationsRedirect", () => {
  it("defaults missing lineId to central", () => {
    const href = mapLegacyRouteStationsRedirect();
    const parsed = parseExplorerState(new URL(href, "https://example.com").searchParams);
    assert.equal(parsed.id, "central");
    assert.equal(parsed.dir, "inbound");
  });

  it("preserves lineId and outbound direction", () => {
    const href = mapLegacyRouteStationsRedirect("Victoria", "outbound");
    const parsed = parseExplorerState(new URL(href, "https://example.com").searchParams);
    assert.equal(parsed.kind, "lines");
    assert.equal(parsed.domain, "tube-rail");
    assert.equal(parsed.id, "victoria");
    assert.equal(parsed.dir, "outbound");
  });

  it("falls back unknown direction to inbound", () => {
    const href = mapLegacyRouteStationsRedirect("northern", "both");
    const parsed = parseExplorerState(new URL(href, "https://example.com").searchParams);
    assert.equal(parsed.dir, "inbound");
  });
});

describe("mapLegacyBusStopsRedirect", () => {
  it("maps to points / bus / browse", () => {
    const href = mapLegacyBusStopsRedirect();
    const parsed = parseExplorerState(new URL(href, "https://example.com").searchParams);
    assert.equal(parsed.kind, "points");
    assert.equal(parsed.domain, "bus");
    assert.equal(parsed.tab, "browse");
  });
});
