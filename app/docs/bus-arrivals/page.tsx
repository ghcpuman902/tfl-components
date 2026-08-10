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
  stopPointIds: ["490000077E"],
  sortBy: "timeToStation",
})

<ArrivalsBoard data={data} stopName="Euston Bus Station" />`,
    relatedLinks: [
      { href: "/docs/tube-rail-arrivals", label: "Tube & Rail Arrivals" },
      { href: "/docs/colors", label: "Colours" },
    ],
  });
}
