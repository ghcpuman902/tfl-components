import { BusArrivalsBoard } from "@/components/tfl/arrivals/bus-arrivals-board"
import { RailArrivalsBoard } from "@/components/tfl/arrivals/rail-arrivals-board"
import { DataSourceLabel } from "@/components/docs/data-source-label"
import {
  LIVERPOOL_STREET_ARRIVALS,
  LIVERPOOL_STREET_LINE_GROUPS,
  LIVERPOOL_STREET_LINES,
  OXFORD_CIRCUS_ARRIVALS,
  OXFORD_CIRCUS_LINES,
  TRAFALGAR_SQUARE_ARRIVALS,
} from "@/lib/tfl/fixtures/arrivals-boards"

/**
 * Deterministic layout demos for the arrivals docs. Fixture data keeps
 * screenshots stable; each board still pages client-side on hover. The
 * classNames values here are the example — they map to `data-slot` levels.
 */

const DemoFigure = ({ children }: { children: React.ReactNode }) => (
  <div className="my-6 space-y-3">
    {children}
    <DataSourceLabel source="fixture" />
  </div>
)

/** Shared-track merge: Circle / H&C / Met at Liverpool Street. */
export const RailSharedTrackGroupDemo = () => (
  <DemoFigure>
    <RailArrivalsBoard
      data={LIVERPOOL_STREET_ARRIVALS}
      lines={LIVERPOOL_STREET_LINES}
      lineGroups={LIVERPOOL_STREET_LINE_GROUPS}
      pageSizeByLine={{
        circle: 6,
        "hammersmith-city": 6,
        metropolitan: 6,
      }}
      stopName="Liverpool Street"
      headingLevel={2}
    />
  </DemoFigure>
)

/** Line sections side by side once the board is wide enough. */
export const RailLineColumnsDemo = () => (
  <DemoFigure>
    <RailArrivalsBoard
      data={OXFORD_CIRCUS_ARRIVALS}
      lines={OXFORD_CIRCUS_LINES}
      stopName="Oxford Circus"
      headingLevel={2}
      classNames={{
        groups:
          "@min-[52rem]/arrivals:grid-cols-3 @min-[52rem]/arrivals:gap-x-6",
      }}
    />
  </DemoFigure>
)

/** 3. Lines stacked; each wide line lays its bounds out side by side. */
export const RailBoundColumnsDemo = () => (
  <DemoFigure>
    <RailArrivalsBoard
      data={OXFORD_CIRCUS_ARRIVALS}
      lines={OXFORD_CIRCUS_LINES}
      stopName="Oxford Circus"
      headingLevel={2}
      classNames={{
        subgroups:
          "@min-[30rem]/arrivals-group:grid-cols-2 @min-[30rem]/arrivals-group:gap-x-6",
      }}
    />
  </DemoFigure>
)

/**
 * 4. Line columns via flex-wrap; each line decides its own bound layout.
 * Lines sharing a row stay narrow and stack bounds; a line alone on a row
 * grows wide enough to place its bounds side by side.
 */
export const RailLineAndBoundColumnsDemo = () => (
  <DemoFigure>
    <RailArrivalsBoard
      data={OXFORD_CIRCUS_ARRIVALS}
      lines={OXFORD_CIRCUS_LINES}
      stopName="Oxford Circus"
      headingLevel={2}
      classNames={{
        groups:
          "@min-[42rem]/arrivals:flex @min-[42rem]/arrivals:flex-wrap @min-[42rem]/arrivals:gap-x-6",
        group: "@min-[42rem]/arrivals:grow @min-[42rem]/arrivals:basis-[24rem]",
        subgroups:
          "@min-[40rem]/arrivals-group:grid-cols-2 @min-[40rem]/arrivals-group:gap-x-4",
      }}
    />
  </DemoFigure>
)

/** 5. Grouped bus routes in responsive columns. */
export const BusRouteColumnsDemo = () => (
  <DemoFigure>
    <BusArrivalsBoard
      data={TRAFALGAR_SQUARE_ARRIVALS}
      stopName="Trafalgar Square"
      stopLetter="G"
      headingLevel={2}
      groupBy="route"
      classNames={{
        groups:
          "@min-[40rem]/arrivals:grid-cols-2 @min-[40rem]/arrivals:gap-x-6",
      }}
    />
  </DemoFigure>
)

/** 6. Flat bus default: one time-ordered list at every width. */
export const BusFlatDemo = () => (
  <DemoFigure>
    <BusArrivalsBoard
      data={TRAFALGAR_SQUARE_ARRIVALS}
      stopName="Trafalgar Square"
      stopLetter="G"
      headingLevel={2}
    />
  </DemoFigure>
)
