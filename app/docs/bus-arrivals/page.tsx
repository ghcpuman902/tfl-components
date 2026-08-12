import type { Metadata } from "next"
import {
  componentDocsMetadata,
  renderComponentDocs,
} from "@/components/docs/render-component-docs"

export const generateMetadata = (): Promise<Metadata> =>
  componentDocsMetadata("bus-arrivals")

export default function BusArrivalsPage() {
  return renderComponentDocs({
    slug: "bus-arrivals",
    getDataExample: `const stopId = "490000091G"
const [stop, data] = await Promise.all([
  tfl.stopPoint.get(stopId),
  tfl.stopPoint.getArrivals({
    stopPointIds: [stopId],
    sortBy: "timeToStation",
  }),
])

<BusArrivalsBoard
  data={data}
  stopName={stop.commonName}
  stopLetter={stop.stopLetter}
/>`,
    relatedLinks: [
      { href: "/docs/tube-rail-arrivals", label: "Tube & Rail Arrivals" },
      { href: "/explore/bus-stops", label: "Explorer · Bus stops" },
      { href: "/docs/colors", label: "Colours" },
    ],
  })
}
