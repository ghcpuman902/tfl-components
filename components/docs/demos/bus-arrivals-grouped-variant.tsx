import { Suspense } from "react"
import { BusArrivalsBoardGroupedDemo } from "@/components/docs/demos/bus-arrivals-board-demo"

/** Server wrapper so the grouped live board can sit in MDX behind Suspense. */
export const BusArrivalsGroupedVariant = () => (
  <div className="my-6">
    <Suspense
      fallback={
        <div
          className="h-40 animate-pulse rounded-lg bg-muted"
          aria-hidden
        />
      }
    >
      <BusArrivalsBoardGroupedDemo />
    </Suspense>
  </div>
)
