import { RiverBusArrivalsBoard } from "@/components/tfl/arrivals/river-bus-arrivals-board"
import { DataSourceLabel } from "@/components/docs/data-source-label"
import { prepareBusStopDisruptions } from "@/lib/tfl/prepare-bus-stop-disruptions"
import {
  CANARY_WHARF_ARRIVALS,
  CANARY_WHARF_PIER_DISRUPTION,
} from "@/lib/tfl/fixtures/arrivals-boards"

export const RiverBusArrivalsDisruptionDemo = () => {
  const disruptions = prepareBusStopDisruptions(
    [CANARY_WHARF_PIER_DISRUPTION],
    CANARY_WHARF_ARRIVALS,
  )

  return (
    <div className="my-6 space-y-3">
      <RiverBusArrivalsBoard
        data={CANARY_WHARF_ARRIVALS}
        disruptions={disruptions}
        stopName="Canary Wharf Pier"
        headingLevel={2}
      />
      <DataSourceLabel source="fixture" />
    </div>
  )
}
