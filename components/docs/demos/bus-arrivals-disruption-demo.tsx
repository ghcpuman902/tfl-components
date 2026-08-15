import { BusArrivalsBoard } from "@/components/tfl/arrivals/bus-arrivals-board"
import { DataSourceLabel } from "@/components/docs/data-source-label"
import { prepareBusStopDisruptions } from "@/lib/tfl/bus-stop-disruptions"
import {
  CAPWORTH_STREET_ARRIVALS,
  CAPWORTH_STREET_DISRUPTION,
} from "@/lib/tfl/fixtures/arrivals-boards"

/**
 * Real stop, real closure: Capworth Street's stop-point disruption says the
 * stop is closed, but `getArrivals` still returns live 58 / 158 predictions
 * for it — the closure doesn't suppress the feed. Hover (or tap) a warning
 * chip to see the disruption text; the other chip dims to show which one is
 * selected.
 */
export const BusArrivalsDisruptionDemo = () => {
  const disruptions = prepareBusStopDisruptions(
    [CAPWORTH_STREET_DISRUPTION],
    CAPWORTH_STREET_ARRIVALS
  )

  return (
    <div className="my-6 space-y-3">
      <DataSourceLabel source="fixture" />
      <BusArrivalsBoard
        data={CAPWORTH_STREET_ARRIVALS}
        disruptions={disruptions}
        stopName="Capworth Street"
        stopLetter="CV"
        headingLevel={2}
      />
    </div>
  )
}
