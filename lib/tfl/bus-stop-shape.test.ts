import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isBoardableBusStopId,
  isBusStop,
  mapStopPoint,
  mapStopsFromGeoResponse,
  readSmsCode,
  readStopLetter,
  readTowards,
} from "./bus-stop-shape";

describe("readStopLetter", () => {
  it("prefers stopLetter", () => {
    assert.equal(readStopLetter("g", "Stop R"), "G");
  });

  it("falls back to short indicator", () => {
    assert.equal(readStopLetter(undefined, "Stop R"), "R");
  });

  it("ignores long indicators", () => {
    assert.equal(readStopLetter(undefined, "Stand 12"), undefined);
  });
});

describe("readTowards", () => {
  it("reads towards property case-insensitively", () => {
    assert.equal(
      readTowards([{ key: "Towards", value: " Oxford Circus " }]),
      "Oxford Circus",
    );
  });
});

describe("readSmsCode", () => {
  it("reads SmsCode property", () => {
    assert.equal(
      readSmsCode([{ key: "SmsCode", value: "53240" }]),
      "53240",
    );
  });
});

describe("isBoardableBusStopId", () => {
  it("accepts 490… ids", () => {
    assert.equal(isBoardableBusStopId("490000091G"), true);
    assert.equal(isBoardableBusStopId("HUBLBG"), false);
  });
});

describe("isBusStop", () => {
  it("checks modes array", () => {
    assert.equal(isBusStop(["bus"]), true);
    assert.equal(isBusStop(["tube"]), false);
    assert.equal(isBusStop(undefined), false);
  });
});

describe("mapStopPoint", () => {
  it("maps a full stop", () => {
    const mapped = mapStopPoint({
      id: "490000091G",
      commonName: "Trafalgar Square",
      stopLetter: "G",
      distance: 42,
      lat: 51.508,
      lon: -0.128,
      lines: [{ name: "9" }, { name: "24" }],
      additionalProperties: [
        { key: "Towards", value: "Marble Arch" },
        { key: "SmsCode", value: "53240" },
      ],
    });
    assert.deepEqual(mapped, {
      id: "490000091G",
      name: "Trafalgar Square",
      indicator: undefined,
      stopLetter: "G",
      towards: "Marble Arch",
      distance: 42,
      lines: ["9", "24"],
      lat: 51.508,
      lon: -0.128,
      smsCode: "53240",
    });
  });

  it("returns null without id", () => {
    assert.equal(mapStopPoint({ commonName: "Nowhere" }), null);
  });
});

describe("mapStopsFromGeoResponse", () => {
  it("filters, sorts, and limits", () => {
    const result = mapStopsFromGeoResponse(
      [
        {
          id: "490000002",
          commonName: "Far",
          distance: 300,
          modes: ["bus"],
        },
        {
          id: "HUBLBG",
          commonName: "Hub",
          distance: 10,
          modes: ["bus"],
        },
        {
          id: "490000001",
          commonName: "Near",
          distance: 50,
          modes: ["bus"],
        },
        {
          id: "940GZZLU",
          commonName: "Tube",
          distance: 20,
          modes: ["tube"],
        },
      ],
      1,
    );
    assert.equal(result.length, 1);
    assert.equal(result[0]?.id, "490000001");
  });
});
