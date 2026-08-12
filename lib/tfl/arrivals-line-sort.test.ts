import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  arrivalsLineOrderKey,
  compareArrivalsLines,
} from "@/lib/tfl/arrivals-line-sort";

describe("arrivalsLineOrderKey", () => {
  it("ranks known lines by LINE_ORDER", () => {
    assert.ok(arrivalsLineOrderKey("central") < arrivalsLineOrderKey("victoria"));
    assert.ok(arrivalsLineOrderKey("victoria") < arrivalsLineOrderKey("bakerloo"));
  });

  it("puts unknown ids after the canonical list", () => {
    assert.ok(
      arrivalsLineOrderKey("not-a-real-line") > arrivalsLineOrderKey("windrush"),
    );
  });
});

describe("compareArrivalsLines", () => {
  it("keeps lines with information above empty lines", () => {
    const emptyCentral = {
      lineId: "central",
      lineName: "Central",
      hasInformation: false,
    };
    const busyBakerloo = {
      lineId: "bakerloo",
      lineName: "Bakerloo",
      hasInformation: true,
    };
    assert.ok(compareArrivalsLines(busyBakerloo, emptyCentral) < 0);
    assert.ok(compareArrivalsLines(emptyCentral, busyBakerloo) > 0);
  });

  it("uses LINE_ORDER among non-empty rail lines (not soonest train)", () => {
    const victoria = {
      lineId: "victoria",
      lineName: "Victoria",
      hasInformation: true,
    };
    const central = {
      lineId: "central",
      lineName: "Central",
      hasInformation: true,
    };
    assert.ok(compareArrivalsLines(central, victoria) < 0);
  });

  it("uses LINE_ORDER among empty rail lines too", () => {
    const victoria = {
      lineId: "victoria",
      lineName: "Victoria",
      hasInformation: false,
    };
    const bakerloo = {
      lineId: "bakerloo",
      lineName: "Bakerloo",
      hasInformation: false,
    };
    assert.ok(compareArrivalsLines(victoria, bakerloo) < 0);
  });

  it("sorts bus routes by name, still info-first", () => {
    const empty9 = {
      lineId: "9",
      lineName: "9",
      bus: true,
      hasInformation: false,
    };
    const busy87 = {
      lineId: "87",
      lineName: "87",
      bus: true,
      hasInformation: true,
    };
    const busy15 = {
      lineId: "15",
      lineName: "15",
      bus: true,
      hasInformation: true,
    };
    assert.ok(compareArrivalsLines(busy87, empty9) < 0);
    assert.ok(compareArrivalsLines(busy15, busy87) < 0);
  });
});
