import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isDefaultBoardSlots,
  parseBoardPanels,
  parseDockIdList,
  parseRouteIdList,
  resolveBoardSlots,
  serializeBoardPanels,
  serializeDockIdList,
} from "./board-panels";

describe("parseBoardPanels", () => {
  it("normalizes, dedupes, and drops unknown kinds", () => {
    assert.deepEqual(parseBoardPanels("Rail,bus,RAIL,clock,status"), [
      "rail",
      "bus",
      "status",
    ]);
  });

  it("returns undefined for empty or all-invalid", () => {
    assert.equal(parseBoardPanels(""), undefined);
    assert.equal(parseBoardPanels("clock"), undefined);
    assert.equal(parseBoardPanels(null), undefined);
  });
});

describe("serializeBoardPanels", () => {
  it("omits empty lists", () => {
    assert.equal(serializeBoardPanels(undefined), undefined);
    assert.equal(serializeBoardPanels([]), undefined);
  });

  it("joins valid kinds", () => {
    assert.equal(serializeBoardPanels(["rail", "cycle"]), "rail,cycle");
  });
});

describe("resolveBoardSlots", () => {
  it("defaults omitted slots to rail + status", () => {
    assert.deepEqual(resolveBoardSlots(undefined, undefined), {
      p1: ["rail"],
      p2: ["status"],
    });
  });

  it("treats a set p1 and omitted p2 as a single column", () => {
    assert.deepEqual(resolveBoardSlots(["rail"], undefined), {
      p1: ["rail"],
      p2: [],
    });
  });

  it("keeps an explicit empty p1", () => {
    assert.deepEqual(resolveBoardSlots([], ["status"]), {
      p1: [],
      p2: ["status"],
    });
  });
});

describe("isDefaultBoardSlots", () => {
  it("is true when both slots match the omitted default", () => {
    assert.equal(isDefaultBoardSlots(undefined, undefined), true);
    assert.equal(isDefaultBoardSlots(["rail"], ["status"]), true);
    assert.equal(isDefaultBoardSlots(["rail"], []), false);
    assert.equal(isDefaultBoardSlots(["status"], []), false);
  });
});

describe("route and dock lists", () => {
  it("parses bus routes", () => {
    assert.deepEqual(parseRouteIdList("73,N8,73,nope"), ["73", "n8"]);
  });

  it("normalizes BikePoint ids", () => {
    assert.deepEqual(parseDockIdList("237,BikePoints_46,x"), [
      "BikePoints_237",
      "BikePoints_46",
    ]);
    assert.equal(
      serializeDockIdList(["237", "BikePoints_46"]),
      "BikePoints_237,BikePoints_46",
    );
  });
});
