import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterNamedPlaces, nearestCatalogStation } from "./board-nearby";

describe("nearestCatalogStation", () => {
  it("finds Oxford Circus from a point beside it", () => {
    const nearest = nearestCatalogStation(51.5152, -0.1419);
    assert.ok(nearest);
    assert.equal(nearest?.id, "940GZZLUOXC");
  });
});

describe("filterNamedPlaces", () => {
  const places = [
    { id: "930GCAW", name: "Canary Wharf Pier" },
    { id: "930GWFD", name: "London Bridge City Pier" },
    { id: "930GWRF", name: "Woolwich Arsenal Pier" },
  ];

  it("matches name or id and caps the list", () => {
    assert.deepEqual(
      filterNamedPlaces(places, "pier").map((place) => place.id),
      ["930GCAW", "930GWFD", "930GWRF"],
    );
    assert.deepEqual(
      filterNamedPlaces(places, "canary").map((place) => place.id),
      ["930GCAW"],
    );
    assert.deepEqual(
      filterNamedPlaces(places, "930gwfd").map((place) => place.id),
      ["930GWFD"],
    );
    assert.equal(filterNamedPlaces(places, "pier", 1).length, 1);
  });

  it("ignores short queries", () => {
    assert.deepEqual(filterNamedPlaces(places, "c"), []);
    assert.deepEqual(filterNamedPlaces(places, " "), []);
  });
});
