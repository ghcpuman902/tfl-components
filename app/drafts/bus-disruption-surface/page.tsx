import type { Metadata } from "next"
import { QuietChip } from "@/components/tfl/arrivals/quiet-chip"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { TRAFALGAR_SQUARE_ARRIVALS } from "@/lib/tfl/fixtures/arrivals-boards"
import { prepareBusStopDisruptions } from "@/lib/tfl/prepare-bus-stop-disruptions"

export const metadata: Metadata = {
  title: "Draft: Bus disruption surface",
  description:
    "A separate disruption list that does not share arrivals row height.",
}

const SAMPLE_DISRUPTIONS = prepareBusStopDisruptions(
  [
    {
      description:
        "Route 11 is on diversion and will not serve this stop. Use Whitehall or Strand.",
    },
    {
      description: "Route 24 is delayed by roadworks at Parliament Square.",
    },
  ],
  TRAFALGAR_SQUARE_ARRIVALS
)

export default function BusDisruptionSurfaceDraftPage() {
  return (
    <DocsReadableWidth>
      <article className="space-y-6">
        <header>
          <p className="text-sm text-muted-foreground">Draft</p>
          <h1 className="tfl-title text-3xl text-foreground">
            Bus disruption surface
          </h1>
          <p className="mt-2 max-w-prose text-muted-foreground">
            Disruption as its own list, not inside the arrivals rows. Use this
            when the copy is longer than a header chip, or covers routes the
            arrivals list does not.
          </p>
        </header>
        <div className="flex w-full flex-col">
          <div className="box-border flex h-12 items-center text-xl font-semibold">
            Bus disruptions
          </div>
          {SAMPLE_DISRUPTIONS.map((item) => (
            <div
              key={item.lineId}
              className="box-border flex min-h-12 flex-col justify-center gap-1 border-t py-2"
            >
              <div className="flex items-center gap-2">
                <QuietChip>{item.lineId}</QuietChip>
                <p className="text-sm font-medium">Route {item.lineId}</p>
              </div>
              <p className="text-sm text-foreground/80">{item.description}</p>
            </div>
          ))}
        </div>
      </article>
    </DocsReadableWidth>
  )
}
