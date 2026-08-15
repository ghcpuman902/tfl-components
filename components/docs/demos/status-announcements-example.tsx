import { TubeStatusBoard } from "@/components/tfl/status/tube-status-board"
import type { StatusLine } from "@/lib/tfl/status-types"

/** Sunday afternoon — both tram windows overlap; `isNow` is still false. */
const FIXTURE_NOW = Date.parse("2026-08-16T16:30:00Z")

/**
 * Tram pair: a multi-day closure whose text contains a nested “Additional works”
 * row — the default board collapses them; `dedupe={false}` shows both.
 * `isNow` is false on the live window on purpose: the board must not treat
 * `isNow` as a clock.
 */
const TRAM_FIXTURE: StatusLine[] = [
  {
    id: "tram",
    name: "Tram",
    modeName: "tram",
    lineStatuses: [
      {
        statusSeverity: 5,
        statusSeverityDescription: "Part Closure",
        reason:
          "LONDON TRAMS: From Thursday 6 until Sunday 23 August, no service between Reeves Corner and East Croydon. Additional works apply on Sunday 16 August.",
        disruption: { category: "PlannedWork" },
        validityPeriods: [
          {
            isNow: false,
            fromDate: "2026-08-06T00:00:00Z",
            toDate: "2026-08-24T00:00:00Z",
          },
        ],
      },
      {
        statusSeverity: 4,
        statusSeverityDescription: "Planned Closure",
        reason: "LONDON TRAMS: Additional works apply on Sunday 16 August.",
        disruption: { category: "PlannedWork" },
        validityPeriods: [
          {
            isNow: false,
            fromDate: "2026-08-16T00:00:00Z",
            toDate: "2026-08-17T00:00:00Z",
          },
        ],
      },
    ],
  },
]

export const StatusAnnouncementsExample = () => (
  <div className="grid gap-6 md:grid-cols-2">
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">Default (deduped)</p>
      <TubeStatusBoard
        data={TRAM_FIXTURE}
        now={FIXTURE_NOW}
        hideHeader
        compact
      />
    </div>
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">
        <code className="text-xs">dedupe={"{false}"}</code>
      </p>
      <TubeStatusBoard
        data={TRAM_FIXTURE}
        now={FIXTURE_NOW}
        hideHeader
        compact
        dedupe={false}
      />
    </div>
  </div>
)
