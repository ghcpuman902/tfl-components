import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isCurrentAnnouncement,
  isScheduledEngineeringWork,
  prepareLineAnnouncements,
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

describe("isScheduledEngineeringWork", () => {
  it("detects Planned Closure and PlannedWork", () => {
    assert.equal(
      isScheduledEngineeringWork({
        statusSeverity: 4,
        statusSeverityDescription: "Planned Closure",
      }),
      true,
    );
    assert.equal(
      isScheduledEngineeringWork({
        statusSeverity: 5,
        statusSeverityDescription: "Part Closure",
        disruption: { category: "PlannedWork" },
      }),
      true,
    );
    assert.equal(
      isScheduledEngineeringWork({
        statusSeverity: 6,
        statusSeverityDescription: "Severe Delays",
      }),
      false,
    );
  });
});

describe("isCurrentAnnouncement", () => {
  it("treats realtime rows with no validityPeriods as current", () => {
    assert.equal(
      isCurrentAnnouncement({
        statusSeverity: 6,
        reason: "Severe delays due to a signal failure.",
      }),
      true,
    );
  });

  it("keeps a row when any period is isNow", () => {
    assert.equal(
      isCurrentAnnouncement({
        statusSeverity: 5,
        validityPeriods: [
          {
            isNow: false,
            fromDate: "2026-08-16T00:00:00Z",
            toDate: "2026-08-17T00:00:00Z",
          },
          {
            isNow: true,
            fromDate: "2026-08-06T00:00:00Z",
            toDate: "2026-08-24T00:00:00Z",
          },
        ],
      }),
      true,
    );
  });

  it("drops a row whose every period has isNow false", () => {
    assert.equal(
      isCurrentAnnouncement({
        statusSeverity: 4,
        validityPeriods: [
          {
            isNow: false,
            fromDate: "2026-08-16T00:00:00Z",
            toDate: "2026-08-17T00:00:00Z",
          },
        ],
      }),
      false,
    );
  });
});

describe("prepareLineAnnouncements", () => {
  const tramLine = { name: "Tram", modeName: "tram" };

  it("keeps a realtime row with no validityPeriods under currentOnly", () => {
    const result = prepareLineAnnouncements(
      [
        {
          statusSeverity: 6,
          statusSeverityDescription: "Severe Delays",
          reason: "Severe delays due to a signal failure.",
        },
      ],
      { currentOnly: true },
    );
    assert.equal(result.length, 1);
    assert.equal(result[0]?.text, "Severe delays due to a signal failure.");
  });

  it("drops future-only rows when currentOnly, keeps them when off", () => {
    const future = {
      statusSeverity: 4,
      statusSeverityDescription: "Planned Closure",
      reason: "LONDON TRAMS: Additional works apply on Sunday 16 August.",
      validityPeriods: [
        {
          isNow: false,
          fromDate: "2026-08-16T00:00:00Z",
          toDate: "2026-08-17T00:00:00Z",
        },
      ],
      disruption: { category: "PlannedWork" },
    };

    assert.equal(
      prepareLineAnnouncements([future], { line: tramLine, currentOnly: true })
        .length,
      0,
    );

    const kept = prepareLineAnnouncements([future], {
      line: tramLine,
      currentOnly: false,
    });
    assert.equal(kept.length, 1);
    assert.equal(kept[0]?.text, "Additional works apply on Sunday 16 August.");
    assert.equal(kept[0]?.statusSeverityDescription, "Planned Closure");
  });

  it("collapses exact duplicate paragraphs and reports sourceCount 2", () => {
    const reason =
      "No service between Moor Park and Amersham / Chesham due to a signal failure.";
    const result = prepareLineAnnouncements(
      [
        {
          statusSeverity: 3,
          statusSeverityDescription: "Part Suspended",
          reason,
        },
        {
          statusSeverity: 3,
          statusSeverityDescription: "Part Suspended",
          reason,
        },
      ],
      { dedupe: true },
    );
    assert.equal(result.length, 1);
    assert.equal(result[0]?.sourceCount, 2);
    assert.equal(result[0]?.text, reason);
  });

  it("keeps the longer paragraph when one text contains the other", () => {
    const long =
      "From Thursday 6 until Sunday 23 August, no service between Reeves Corner and East Croydon. Additional works apply on Sunday 16 August.";
    const short = "Additional works apply on Sunday 16 August.";
    const result = prepareLineAnnouncements(
      [
        {
          statusSeverity: 5,
          statusSeverityDescription: "Part Closure",
          reason: `LONDON TRAMS: ${long}`,
          disruption: { category: "PlannedWork" },
        },
        {
          statusSeverity: 4,
          statusSeverityDescription: "Planned Closure",
          reason: `LONDON TRAMS: ${short}`,
          disruption: { category: "PlannedWork" },
        },
      ],
      { line: tramLine, dedupe: true },
    );
    assert.equal(result.length, 1);
    assert.equal(result[0]?.text, long);
    assert.equal(result[0]?.sourceCount, 2);
  });

  it("merges identical reason at severity 2 and 16 to severity 2", () => {
    const reason =
      "No service between Moor Park and Amersham / Chesham due to a signal failure. A special service is operating.";
    const result = prepareLineAnnouncements(
      [
        {
          statusSeverity: 2,
          statusSeverityDescription: "Suspended",
          reason,
        },
        {
          statusSeverity: 16,
          statusSeverityDescription: "Special Service",
          reason,
        },
      ],
      { dedupe: true },
    );
    assert.equal(result.length, 1);
    assert.equal(result[0]?.statusSeverity, 2);
    assert.equal(result[0]?.statusSeverityDescription, "Suspended");
    assert.equal(result[0]?.sourceCount, 2);
  });

  it("keeps two non-overlapping paragraphs", () => {
    const result = prepareLineAnnouncements(
      [
        {
          statusSeverity: 6,
          statusSeverityDescription: "Severe Delays",
          reason:
            "Severe delays between Bank and Lewisham due to a track fault.",
        },
        {
          statusSeverity: 9,
          statusSeverityDescription: "Minor Delays",
          reason:
            "Minor delays between Stratford and Beckton due to train cancellations.",
        },
      ],
      { dedupe: true },
    );
    assert.equal(result.length, 2);
  });

  it("skips dedupe when dedupe is false", () => {
    const reason = "Severe delays due to a signal failure.";
    const result = prepareLineAnnouncements(
      [
        {
          statusSeverity: 6,
          statusSeverityDescription: "Severe Delays",
          reason,
        },
        {
          statusSeverity: 6,
          statusSeverityDescription: "Severe Delays",
          reason,
        },
      ],
      { dedupe: false },
    );
    assert.equal(result.length, 2);
  });
});
