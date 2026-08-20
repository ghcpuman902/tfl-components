import { BusArrivalsBoardGroupedDemo } from "@/components/docs/demos/bus-arrivals-board-demo"

/** Server wrapper so the grouped live board can sit in MDX behind Suspense. */
export const BusArrivalsGroupedVariant = () => (
  <div className="my-6">
    <BusArrivalsBoardGroupedDemo />
  </div>
)
