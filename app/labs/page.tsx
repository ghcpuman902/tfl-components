import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { SectionHub } from "@/components/docs/section-hub"
import { WipNotice } from "@/components/docs/wip-notice"
import { getDocsEntry } from "@/lib/docs-catalog"
import { pageMetadata, ROUTE_PAGE_META } from "@/lib/site-metadata"

export const metadata: Metadata = pageMetadata(ROUTE_PAGE_META.labs)

export default function LabsIndexPage() {
  const entry = getDocsEntry("blocks-index")
  if (!entry) notFound()

  return (
    <SectionHub
      entry={entry}
      banner={
        <WipNotice>
          Labs is experimental. These displays may change or break before
          version 1.0.
        </WipNotice>
      }
      purpose="Experimental displays and composed examples built from the component library. They show how data-aware components and rendering primitives combine. A Lab is not a single installable component API."
      relatedHrefs={[
        { href: "/docs/components", label: "Components catalogue" },
        { href: "/docs/map-schematic", label: "Schematic maps" },
        { href: "/labs/week-ahead", label: "Week ahead" },
        {
          href: "/docs/live-vehicle-tracking",
          label: "Live Tube & Rail vehicles",
        },
        { href: "/docs/live-bus-vehicles", label: "Live buses" },
      ]}
    />
  )
}
