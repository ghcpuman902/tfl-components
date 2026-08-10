import type { Metadata } from "next";
import {
  componentDocsMetadata,
  renderComponentDocs,
} from "@/components/docs/render-component-docs";

export const generateMetadata = (): Promise<Metadata> =>
  componentDocsMetadata("bus-arrivals");

export default function BusArrivalsPage() {
  return renderComponentDocs({
    slug: "bus-arrivals",
    getDataExample: `const data = await tfl.stopPoint.getArrivals({
  stopPointIds: ["490000091G"],
  sortBy: "timeToStation",
})

<ArrivalsBoard
  data={data}
  variant="bus"
  stopName="Trafalgar Square"
  stopLetter="G"
/>`,
    relatedLinks: [
      { href: "/docs/tube-rail-arrivals", label: "Tube & Rail Arrivals" },
      { href: "/explore/bus-stops", label: "Explorer · Bus stops" },
      { href: "/docs/colors", label: "Colours" },
    ],
  });
}
