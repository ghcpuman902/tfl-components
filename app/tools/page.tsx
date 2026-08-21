import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { SectionHub } from "@/components/docs/section-hub"
import { getDocsEntry } from "@/lib/docs-catalog"
import { pageMetadata } from "@/lib/site-metadata"

export const metadata: Metadata = pageMetadata({
  title: "Tools",
  description:
    "Developer playgrounds. Inspect, test, tune, or debug. Not embeddable product UI.",
  path: "/tools",
  robots: { index: false, follow: false },
})

export default function ToolsIndexPage() {
  const entry = getDocsEntry("tools-index")
  if (!entry) notFound()

  return (
    <SectionHub
      entry={entry}
      purpose="A tool exists to inspect, test, understand, tune, generate, compare, or debug. It is not the production component API. Reject Misc dumping-ground entries; use Drafts for incubation."
      comingSoon={[
        "Fixture and state inspectors",
        "Diagram tuning playgrounds",
      ]}
      relatedHrefs={[
        { href: "/drafts", label: "Drafts — not yet tools" },
        { href: "/docs/components", label: "Components — embeddable UI" },
        { href: "/docs/station-name-labels", label: "Station name labels" },
      ]}
    />
  )
}
