import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compassPointToDegrees,
  isBoardableBusStopId,
  isBusStop,
  mapStopPoint,
  mapStopsFromGeoResponse,
  readBearingDegrees,
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

  it("drops compass arrows instead of slicing to ->", () => {
    assert.equal(readStopLetter("->W", "->W"), undefined);
  });
});

describe("readTowards", () => {
  it("reads towards property case-insensitively", () => {
    assert.equal(
      readTowards([{ key: "Towards", value: " Oxford Circus " }]),
      "Oxford Circus",
    );
  });

  it("drops a literal null towards", () => {
    assert.equal(readTowards([{ key: "Towards", value: "null" }]), undefined);
  });
});

describe("compassPointToDegrees", () => {
  it("maps compass points and arrows", () => {
    assert.equal(compassPointToDegrees("N"), 0);
    assert.equal(compassPointToDegrees("NE"), 45);
    assert.equal(compassPointToDegrees("->W"), 270);
    assert.equal(compassPointToDegrees("90"), 90);
  });

  it("ignores painted stop letters", () => {
    assert.equal(compassPointToDegrees("Stop G"), undefined);
    assert.equal(compassPointToDegrees("RG"), undefined);
  });
});

describe("readBearingDegrees", () => {
  it("prefers CompassPoint over an arrow indicator", () => {
    assert.equal(
      readBearingDegrees(
        [{ key: "CompassPoint", value: "S" }],
        "->W",
        "->W",
      ),
      180,
    );
  });

  it("falls back to a compass indicator", () => {
    assert.equal(readBearingDegrees(undefined, "->E"), 90);
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
    assert.equal(isBoardableBusStopId("490G00014016"), false);
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
        { key: "CompassPoint", value: "NE" },
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
      bearingDegrees: 45,
    });
  });

  it("reads towards from a search hit field", () => {
    const mapped = mapStopPoint({
      id: "490000251E",
      commonName: "Wapping Station",
      towards: "Limehouse",
    });
    assert.equal(mapped?.towards, "Limehouse");
  });

  it("reads bearing from a compass indicator when there is no letter", () => {
    const mapped = mapStopPoint({
      id: "490012020A",
      commonName: "The Highway",
      stopLetter: "->W",
      indicator: "->W",
    });
    assert.equal(mapped?.stopLetter, undefined);
    assert.equal(mapped?.bearingDegrees, 270);
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
