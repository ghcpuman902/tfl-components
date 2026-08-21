import type { Metadata } from "next"
import { BusArrivalsBoard } from "@/components/tfl/arrivals/bus-arrivals-board"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { TRAFALGAR_SQUARE_ARRIVALS } from "@/lib/tfl/fixtures/arrivals-boards"
import { prepareBusStopDisruptions } from "@/lib/tfl/prepare-bus-stop-disruptions"

export const metadata: Metadata = {
  title: "Draft: Bus disruption band",
  description: "Keep arrival rows fixed and show disruption as a compact band.",
  robots: { index: false, follow: false },
}

const SAMPLE_DISRUPTIONS = prepareBusStopDisruptions(
  [
    {
      description: "Route 11 is on diversion and will not serve this stop.",
    },
  ],
  TRAFALGAR_SQUARE_ARRIVALS
)

export default function BusDisruptionBandDraftPage() {
  return (
    <DocsReadableWidth>
      <article className="space-y-6">
        <header>
          <p className="text-sm text-muted-foreground">Draft</p>
          <h1 className="tfl-title text-3xl text-foreground">
            Bus disruption band
          </h1>
          <p className="mt-2 max-w-prose text-muted-foreground">
            Warning chips stay in the header. Arrival rows keep their height —
            do not grow them to fit disruption copy.
          </p>
        </header>
        <BusArrivalsBoard
          data={TRAFALGAR_SQUARE_ARRIVALS}
          disruptions={SAMPLE_DISRUPTIONS}
          stopName="Trafalgar Square"
          stopLetter="G"
          headingLevel={2}
          pageSize={3}
        />
      </article>
    </DocsReadableWidth>
  )
}
