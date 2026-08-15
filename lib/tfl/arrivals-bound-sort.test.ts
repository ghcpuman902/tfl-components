import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  arrivalsBoundOrderKey,
  compareArrivalsBounds,
  formatArrivalsBoundLabel,
  normalizeArrivalsBoundId,
  parseArrivalsPlatformLabel,
  parseCompassBoundId,
} from "@/lib/tfl/arrivals-bound-sort";

describe("normalizeArrivalsBoundId", () => {
  it("accepts canonical and display casing", () => {
    assert.equal(normalizeArrivalsBoundId("Westbound"), "westbound");
    assert.equal(normalizeArrivalsBoundId("eastbound"), "eastbound");
    assert.equal(normalizeArrivalsBoundId("nope"), null);
  });
});

describe("parseCompassBoundId", () => {
  it("reads the compass prefix from platformName", () => {
    assert.equal(
      parseCompassBoundId("Westbound - Platform 1"),
      "westbound",
    );
    assert.equal(
      parseCompassBoundId("Eastbound - Platform 2"),
      "eastbound",
    );
    assert.equal(parseCompassBoundId("Platform 3"), null);
  });
});

describe("parseArrivalsPlatformLabel", () => {
  it("strips compass prefixes and the word Platform", () => {
    assert.equal(parseArrivalsPlatformLabel("Westbound - Platform 1"), "1");
    assert.equal(parseArrivalsPlatformLabel("Platform 3"), "3");
    assert.equal(parseArrivalsPlatformLabel("A"), "A");
    assert.equal(parseArrivalsPlatformLabel("B"), "B");
    assert.equal(parseArrivalsPlatformLabel("PA"), "PA");
  });

  it("drops TfL's literal Unknown", () => {
    assert.equal(parseArrivalsPlatformLabel("Platform Unknown"), null);
    assert.equal(parseArrivalsPlatformLabel("Unknown"), null);
    assert.equal(parseArrivalsPlatformLabel(undefined), null);
  });
});

describe("formatArrivalsBoundLabel", () => {
  it("title-cases the id", () => {
    assert.equal(formatArrivalsBoundLabel("westbound"), "Westbound");
  });
});

describe("compareArrivalsBounds", () => {
  it("puts West before East and North before South", () => {
    assert.ok(compareArrivalsBounds("Westbound", "Eastbound") < 0);
    assert.ok(compareArrivalsBounds("Northbound", "Southbound") < 0);
  });

  it("orders West→East before North→South on a vertical board", () => {
    assert.ok(arrivalsBoundOrderKey("westbound") < arrivalsBoundOrderKey("eastbound"));
    assert.ok(arrivalsBoundOrderKey("eastbound") < arrivalsBoundOrderKey("northbound"));
    assert.ok(arrivalsBoundOrderKey("northbound") < arrivalsBoundOrderKey("southbound"));
  });

  it("puts unlabeled buckets last", () => {
    assert.ok(compareArrivalsBounds("Southbound", null) < 0);
    assert.ok(compareArrivalsBounds(null, "Westbound") > 0);
  });
});
