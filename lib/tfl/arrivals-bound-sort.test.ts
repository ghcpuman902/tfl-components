import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ARRIVALS_PLATFORM_UNKNOWN_HEADING } from "@/lib/tfl/arrivals-empty";
import {
  arrivalsBoundOrderKey,
  compareArrivalsBounds,
  formatArrivalsBoundLabel,
  formatArrivalsRailDesignationLabel,
  formatBoundHeading,
  formatPlatformHeading,
  isUnknownArrivalsPlatform,
  normalizeArrivalsBoundId,
  parseArrivalsPlatformLabel,
  parseArrivalsRailDesignation,
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

  it("extracts the bare number from Inner/Outer Rail wording without doubling Platform", () => {
    // Paddington, Bayswater, Notting Hill Gate — the shared Circle/H&C stretch
    // where compass direction is ambiguous. Confirmed network-wide via a live
    // survey of every Circle/District/H&C/Metropolitan station.
    assert.equal(parseArrivalsPlatformLabel("Inner Rail - Platform 1"), "1");
    assert.equal(parseArrivalsPlatformLabel("Outer Rail - Platform 2"), "2");
  });

  it("extracts a Platform N token from other descriptive labels", () => {
    // Chalfont & Latimer's Metropolitan branch platform — same double-Platform
    // risk as Inner/Outer Rail, fixed by the same general rule.
    assert.equal(
      parseArrivalsPlatformLabel("Chesham Branch - Platform 3"),
      "3",
    );
  });

  it("returns null for a descriptive label with no platform number", () => {
    // Chesham's single-platform terminus: TfL sends "North / South" instead
    // of a platform number. Nothing short enough for a chip; the bound
    // heading still shows the raw text via formatBoundHeading.
    assert.equal(parseArrivalsPlatformLabel("North / South"), null);
  });
});

describe("parseArrivalsRailDesignation", () => {
  it("reads Inner/Outer Rail from platformName", () => {
    assert.equal(
      parseArrivalsRailDesignation("Inner Rail - Platform 1"),
      "inner",
    );
    assert.equal(
      parseArrivalsRailDesignation("Outer Rail - Platform 2"),
      "outer",
    );
    assert.equal(parseArrivalsRailDesignation("Platform 3"), null);
    assert.equal(parseArrivalsRailDesignation(undefined), null);
  });
});

describe("formatArrivalsRailDesignationLabel", () => {
  it("title-cases the designation", () => {
    assert.equal(formatArrivalsRailDesignationLabel("inner"), "Inner Rail");
    assert.equal(formatArrivalsRailDesignationLabel("outer"), "Outer Rail");
  });
});

describe("formatArrivalsBoundLabel", () => {
  it("title-cases the id", () => {
    assert.equal(formatArrivalsBoundLabel("westbound"), "Westbound");
  });
});

describe("isUnknownArrivalsPlatform", () => {
  it("detects TfL's literal Unknown", () => {
    assert.equal(isUnknownArrivalsPlatform("Platform Unknown"), true);
    assert.equal(isUnknownArrivalsPlatform("Unknown"), true);
    assert.equal(isUnknownArrivalsPlatform("Westbound - Platform 1"), false);
    assert.equal(isUnknownArrivalsPlatform(undefined), false);
  });
});

describe("formatBoundHeading", () => {
  it("joins direction and platform when both exist", () => {
    assert.equal(
      formatBoundHeading({ boundId: "eastbound", platformLabel: "1" }),
      "Eastbound · Platform 1",
    );
  });

  it("spells out a platform-only heading", () => {
    assert.equal(formatPlatformHeading("A"), "Platform A");
    assert.equal(
      formatBoundHeading({ platformLabel: "A" }),
      "Platform A",
    );
  });

  it("keeps a direction-only heading when the platform is not hoisted", () => {
    assert.equal(
      formatBoundHeading({ boundId: "westbound" }),
      "Westbound",
    );
  });

  it("uses the unknown-platform fallback", () => {
    assert.equal(
      formatBoundHeading({ unknown: true }),
      ARRIVALS_PLATFORM_UNKNOWN_HEADING,
    );
  });

  it("joins the rail designation and platform, matching house middot style", () => {
    assert.equal(
      formatBoundHeading({ platformLabel: "1", railDesignation: "inner" }),
      "Inner Rail · Platform 1",
    );
    assert.equal(
      formatBoundHeading({ platformLabel: "2", railDesignation: "outer" }),
      "Outer Rail · Platform 2",
    );
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
