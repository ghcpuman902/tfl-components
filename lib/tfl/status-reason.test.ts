import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getDisruptionStatusIconName,
  isScheduledEngineeringWork,
  stripStatusReason,
} from "@/lib/tfl/status-reason";

describe("stripStatusReason", () => {
  it("strips LONDON TRAMS from tram copy", () => {
    assert.equal(
      stripStatusReason(
        "LONDON TRAMS: From Thursday 6 until Sunday 23 August, no service between Reeves Corner and East Croydon.",
        { name: "Tram", modeName: "tram" },
      ),
      "From Thursday 6 until Sunday 23 August, no service between Reeves Corner and East Croydon.",
    );
  });

  it("strips LINE prefixes from Underground copy", () => {
    assert.equal(
      stripStatusReason("BAKERLOO LINE: Severe delays due to a signal failure.", {
        name: "Bakerloo",
        modeName: "tube",
      }),
      "Severe delays due to a signal failure.",
    );
  });

  it("strips Hammersmith and City when the line name uses &", () => {
    assert.equal(
      stripStatusReason(
        "HAMMERSMITH AND CITY LINE: Minor delays due to train cancellations.",
        { name: "Hammersmith & City", modeName: "tube" },
      ),
      "Minor delays due to train cancellations.",
    );
  });

  it("leaves copy with no mode prefix unchanged", () => {
    assert.equal(
      stripStatusReason(
        "Severe delays between Highbury & Islington and Dalston Junction due to a track fault.",
        { name: "Windrush", modeName: "overground" },
      ),
      "Severe delays between Highbury & Islington and Dalston Junction due to a track fault.",
    );
  });
});

describe("getDisruptionStatusIconName", () => {
  it("uses CalendarClock for Planned Closure", () => {
    assert.equal(
      getDisruptionStatusIconName({
        statusSeverity: 4,
        statusSeverityDescription: "Planned Closure",
      }),
      "CalendarClock",
    );
    assert.equal(
      isScheduledEngineeringWork({ statusSeverity: 4 }),
      true,
    );
  });

  it("uses CalendarClock when disruption category is PlannedWork", () => {
    assert.equal(
      getDisruptionStatusIconName({
        statusSeverity: 5,
        statusSeverityDescription: "Part Closure",
        disruption: { category: "PlannedWork" },
      }),
      "CalendarClock",
    );
  });

  it("uses the per-marker candidate when not scheduled", () => {
    assert.equal(
      getDisruptionStatusIconName({
        statusSeverity: 6,
        statusSeverityDescription: "Severe Delays",
      }),
      "TriangleAlert",
    );
    assert.equal(
      getDisruptionStatusIconName({
        statusSeverity: 5,
        statusSeverityDescription: "Part Closure",
      }),
      "RouteOff",
    );
    assert.equal(
      getDisruptionStatusIconName({
        statusSeverity: 9,
        statusSeverityDescription: "Minor Delays",
      }),
      "Clock",
    );
  });
});
