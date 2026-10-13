import type { Metadata } from "next"
import {
  componentDocsMetadata,
  renderComponentDocs,
} from "@/components/docs/render-component-docs"

export const generateMetadata = (): Promise<Metadata> =>
  componentDocsMetadata("live-vehicle-tracking")

const USAGE_SNIPPET = `<LiveRailVehicles
  railLineIds={["central"]}
  targetRequestsPerMinute="max"
/>`

export default function LiveRailVehiclesPage() {
  return renderComponentDocs({
    slug: "live-vehicle-tracking",
    previewBleed: "inset",
    getDataExample: USAGE_SNIPPET,
    relatedLinks: [
      { href: "/docs/map-geographic", label: "Map – Tube & Rail (Geo)" },
      { href: "/docs/live-bus-vehicles", label: "Live buses" },
    ],
  })
}
