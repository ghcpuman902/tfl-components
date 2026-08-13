import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cachedArrivalsForPoint,
  firstOrMatching,
  firstOrMatchingPoint,
  pointMatchesId,
} from "./selection";

describe("firstOrMatching", () => {
  const lines = [
    { id: "bakerloo", name: "Bakerloo" },
    { id: "central", name: "Central" },
  ];

  it("returns the first item when nothing is requested", () => {
    assert.equal(firstOrMatching(lines)?.id, "bakerloo");
  });

  it("returns the requested item when it is in the list", () => {
    assert.equal(firstOrMatching(lines, "central")?.id, "central");
  });

  it("falls back to the first item when the requested id is unknown", () => {
    assert.equal(firstOrMatching(lines, "victoria")?.id, "bakerloo");
  });

  it("returns undefined for an empty list", () => {
    assert.equal(firstOrMatching([], "central"), undefined);
  });
});

describe("firstOrMatchingPoint", () => {
  const stations = [
    { id: "940GZZLUOXC", aliasIds: ["HUBOXC"], name: "Oxford Circus" },
    { id: "940GZZLUVIC", aliasIds: [], name: "Victoria" },
  ];

  it("matches alias ids", () => {
    assert.equal(firstOrMatchingPoint(stations, "HUBOXC")?.id, "940GZZLUOXC");
  });

  it("falls back to the first station", () => {
    assert.equal(firstOrMatchingPoint(stations)?.id, "940GZZLUOXC");
  });
});

describe("pointMatchesId", () => {
  it("matches canonical and alias ids", () => {
    const point = { id: "940GZZLUOXC", aliasIds: ["HUBOXC"] };
    assert.equal(pointMatchesId(point, "940GZZLUOXC"), true);
    assert.equal(pointMatchesId(point, "HUBOXC"), true);
    assert.equal(pointMatchesId(point, "940GZZLUVIC"), false);
  });
});

describe("cachedArrivalsForPoint", () => {
  const cached = {
    stopPointId: "940GZZLUOXC",
    stopName: "Oxford Circus",
    arrivals: [],
    fetchedAt: 1,
  };

  it("returns the payload when the point matches", () => {
    assert.equal(
      cachedArrivalsForPoint(cached, {
        id: "940GZZLUOXC",
        aliasIds: ["HUBOXC"],
      }),
      cached,
    );
  });

  it("returns null for a different point or a failed cache", () => {
    assert.equal(
      cachedArrivalsForPoint(cached, { id: "940GZZLUVIC" }),
      null,
    );
    assert.equal(
      cachedArrivalsForPoint(
        { ...cached, error: "nope" },
        { id: "940GZZLUOXC" },
      ),
      null,
    );
  });
});
