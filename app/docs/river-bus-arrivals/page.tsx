import type { Metadata } from "next"
import {
  componentDocsMetadata,
  renderComponentDocs,
} from "@/components/docs/render-component-docs"

export const generateMetadata = (): Promise<Metadata> =>
  componentDocsMetadata("river-bus-arrivals")

export default function RiverBusArrivalsPage() {
  return renderComponentDocs({
    slug: "river-bus-arrivals",
    getDataExample: `const stopId = "930GCAW"
const [stop, data] = await Promise.all([
  tfl.stopPoint.get(stopId),
  tfl.stopPoint.getArrivals({
    stopPointIds: [stopId],
    sortBy: "timeToStation",
  }),
])

<RiverBusArrivalsBoard
  data={data}
  stopName={stop.commonName}
/>`,
    relatedLinks: [
      { href: "/docs/bus-arrivals", label: "Bus Arrivals" },
      { href: "/docs/tube-rail-status", label: "Tube & Rail Status" },
      { href: "/docs/explorer?domain=river", label: "Explorer · River" },
      { href: "/docs/colors", label: "Colours" },
    ],
  })
}
