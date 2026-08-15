import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isCurrentAnnouncement,
  isScheduledEngineeringWork,
  prepareLineAnnouncements,
  stripStatusReason,
} from "@/lib/tfl/status-reason"

describe("stripStatusReason", () => {
  it("strips LONDON TRAMS from tram copy", () => {
    assert.equal(
      stripStatusReason(
        "LONDON TRAMS: From Thursday 6 until Sunday 23 August, no service between Reeves Corner and East Croydon.",
        { name: "Tram", modeName: "tram" }
      ),
      "From Thursday 6 until Sunday 23 August, no service between Reeves Corner and East Croydon."
    )
  })

  it("strips LINE prefixes from Underground copy", () => {
    assert.equal(
      stripStatusReason(
        "BAKERLOO LINE: Severe delays due to a signal failure.",
        {
          name: "Bakerloo",
          modeName: "tube",
        }
      ),
      "Severe delays due to a signal failure."
    )
  })

  it("strips Hammersmith and City when the line name uses &", () => {
    assert.equal(
      stripStatusReason(
        "HAMMERSMITH AND CITY LINE: Minor delays due to train cancellations.",
        { name: "Hammersmith & City", modeName: "tube" }
      ),
      "Minor delays due to train cancellations."
    )
  })

  it("leaves copy with no mode prefix unchanged", () => {
    assert.equal(
      stripStatusReason(
        "Severe delays between Highbury & Islington and Dalston Junction due to a track fault.",
        { name: "Windrush", modeName: "overground" }
      ),
      "Severe delays between Highbury & Islington and Dalston Junction due to a track fault."
    )
  })
})

describe("isScheduledEngineeringWork", () => {
  it("detects PlannedWork part closure", () => {
    assert.equal(
      isScheduledEngineeringWork({
        statusSeverity: 5,
        statusSeverityDescription: "Part Closure",
        disruption: { category: "PlannedWork" },
      }),
      true
    )
  })

  it("does not treat timetable Planned Closure (Information) as engineering", () => {
    assert.equal(
      isScheduledEngineeringWork({
        statusSeverity: 4,
        statusSeverityDescription: "Planned Closure",
        disruption: { category: "Information" },
      }),
      false
    )
  })

  it("does not treat live delays as engineering", () => {
    assert.equal(
      isScheduledEngineeringWork({
        statusSeverity: 6,
        statusSeverityDescription: "Severe Delays",
      }),
      false
    )
  })
})

describe("isCurrentAnnouncement", () => {
  it("treats realtime rows with no validityPeriods as current", () => {
    assert.equal(
      isCurrentAnnouncement({
        statusSeverity: 6,
        reason: "Severe delays due to a signal failure.",
        disruption: { category: "RealTime" },
      }),
      true
    )
  })

  it("keeps PlannedWork inside today's window even when isNow is false", () => {
    assert.equal(
      isCurrentAnnouncement(
        {
          statusSeverity: 5,
          statusSeverityDescription: "Part Closure",
          disruption: { category: "PlannedWork" },
          validityPeriods: [
            {
              isNow: false,
              fromDate: "2026-08-15T03:15:00Z",
              toDate: "2026-08-15T22:59:00Z",
            },
          ],
        },
        Date.parse("2026-08-15T16:30:00Z")
      ),
      true
    )
  })

  it("drops a window that has not started yet", () => {
    assert.equal(
      isCurrentAnnouncement(
        {
          statusSeverity: 4,
          validityPeriods: [
            {
              isNow: false,
              fromDate: "2026-08-16T00:00:00Z",
              toDate: "2026-08-17T00:00:00Z",
            },
          ],
          disruption: { category: "PlannedWork" },
        },
        Date.parse("2026-08-15T16:30:00Z")
      ),
      false
    )
  })
})

describe("prepareLineAnnouncements", () => {
  const tramLine = { name: "Tram", modeName: "tram" }
  const saturday = Date.parse("2026-08-15T16:30:00Z")

  it("keeps a realtime row with no validityPeriods under currentOnly", () => {
    const result = prepareLineAnnouncements(
      [
        {
          statusSeverity: 6,
          statusSeverityDescription: "Severe Delays",
          reason: "Severe delays due to a signal failure.",
          disruption: { category: "RealTime" },
        },
      ],
      { currentOnly: true, now: saturday }
    )
    assert.equal(result.length, 1)
    assert.equal(result[0]?.text, "Severe delays due to a signal failure.")
  })

  it("keeps PlannedWork in today's window when isNow is false", () => {
    const tram = {
      statusSeverity: 5,
      statusSeverityDescription: "Part Closure",
      reason:
        "LONDON TRAMS: From Thursday 6 until Sunday 23 August, no service between Reeves Corner and East Croydon.",
      validityPeriods: [
        {
          isNow: false,
          fromDate: "2026-08-15T03:15:00Z",
          toDate: "2026-08-15T22:59:00Z",
        },
      ],
      disruption: { category: "PlannedWork" },
    }

    const result = prepareLineAnnouncements([tram], {
      line: tramLine,
      currentOnly: true,
      now: saturday,
    })
    assert.equal(result.length, 1)
    assert.match(result[0]?.text ?? "", /Reeves Corner/)
  })

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
    }

    assert.equal(
      prepareLineAnnouncements([future], {
        line: tramLine,
        currentOnly: true,
        now: saturday,
      }).length,
      0
    )

    const kept = prepareLineAnnouncements([future], {
      line: tramLine,
      currentOnly: false,
      now: saturday,
    })
    assert.equal(kept.length, 1)
    assert.equal(kept[0]?.text, "Additional works apply on Sunday 16 August.")
    assert.equal(kept[0]?.statusSeverityDescription, "Planned Closure")
  })

  it("drops Waterloo & City hours notice when Service Closed is current", () => {
    const result = prepareLineAnnouncements(
      [
        {
          statusSeverity: 4,
          statusSeverityDescription: "Planned Closure",
          reason:
            "Waterloo & City line: service operates 06:00 until 00:30, Monday to Friday only.",
          validityPeriods: [
            {
              isNow: false,
              fromDate: "2026-08-15T03:15:00Z",
              toDate: "2026-08-15T22:59:00Z",
            },
          ],
          disruption: { category: "Information" },
        },
        {
          statusSeverity: 20,
          statusSeverityDescription: "Service Closed",
          reason:
            "Waterloo and City Line: Service will resume at 06:00 on Monday. ",
          validityPeriods: [
            {
              isNow: true,
              fromDate: "2026-08-14T23:30:27Z",
              toDate: "2026-08-15T18:58:13Z",
            },
          ],
          disruption: { category: "RealTime" },
        },
      ],
      {
        line: { name: "Waterloo & City", modeName: "tube" },
        currentOnly: true,
        now: saturday,
      }
    )
    assert.equal(result.length, 1)
    assert.equal(result[0]?.statusSeverity, 20)
    assert.match(result[0]?.text ?? "", /resume at 06:00 on Monday/)
  })

  it("collapses exact duplicate paragraphs and reports sourceCount 2", () => {
    const reason =
      "No service between Moor Park and Amersham / Chesham due to a signal failure."
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
      { dedupe: true }
    )
    assert.equal(result.length, 1)
    assert.equal(result[0]?.sourceCount, 2)
    assert.equal(result[0]?.text, reason)
  })

  it("keeps the longer paragraph when one text contains the other", () => {
    const long =
      "From Thursday 6 until Sunday 23 August, no service between Reeves Corner and East Croydon. Additional works apply on Sunday 16 August."
    const short = "Additional works apply on Sunday 16 August."
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
      { line: tramLine, dedupe: true }
    )
    assert.equal(result.length, 1)
    assert.equal(result[0]?.text, long)
    assert.equal(result[0]?.sourceCount, 2)
  })

  it("merges identical reason at severity 2 and 16 to severity 2", () => {
    const reason =
      "No service between Moor Park and Amersham / Chesham due to a signal failure. A special service is operating."
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
      { dedupe: true }
    )
    assert.equal(result.length, 1)
    assert.equal(result[0]?.statusSeverity, 2)
    assert.equal(result[0]?.statusSeverityDescription, "Suspended")
    assert.equal(result[0]?.sourceCount, 2)
  })

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
      { dedupe: true }
    )
    assert.equal(result.length, 2)
  })

  it("skips dedupe when dedupe is false", () => {
    const reason = "Severe delays due to a signal failure."
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
      { dedupe: false }
    )
    assert.equal(result.length, 2)
  })
})
