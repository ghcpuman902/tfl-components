import type { Metadata } from "next"
import { Suspense } from "react"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { TypographyBodySkeleton } from "@/components/tfl/page-skeletons"
import { StationTypographyLab } from "@/components/tfl/station-typography-lab"
import { getDocsEntry } from "@/lib/docs-catalog"
import { getStationCatalog } from "@/lib/tfl/station-catalog"

export const metadata: Metadata = {
  title: "Station typography",
  description:
    "A–Z destination labels with deterministic two-line word breaks, measured in Hammersmith One.",
}

async function TypographyBody() {
  const stations = await getStationCatalog()
  return <StationTypographyLab stations={stations} />
}

async function TypographyDocs() {
  const { default: MDXPage } = await import("@/content/tools/typography.mdx")
  return <MDXPage />
}

export default async function TypographyPage() {
  const entry = getDocsEntry("station-typography")!

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <DocsPageHeader entry={entry} />
        <Suspense fallback={<TypographyBodySkeleton />}>
          <TypographyBody />
        </Suspense>
        <section className="border-t border-border pt-8">
          {/* Docs are sync after import; Suspense keeps the static shell instant
              if MDX chunk resolution lags during Cache Components validation. */}
          <Suspense fallback={null}>
            <TypographyDocs />
          </Suspense>
        </section>
      </article>
    </DocsReadableWidth>
  )
}
