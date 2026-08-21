import type { ReactNode } from "react"
import { notFound } from "next/navigation"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { getDocsEntry } from "@/lib/docs-catalog"
import { pageMetadata, ROUTE_PAGE_META } from "@/lib/site-metadata"

export const metadata = pageMetadata(ROUTE_PAGE_META.explorer)

export default function DocsExplorerLayout({
  children,
}: {
  children: ReactNode
}) {
  const entry = getDocsEntry("explore-index")
  if (!entry) notFound()

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <DocsPageHeader entry={entry} />
        {children}
      </article>
    </DocsReadableWidth>
  )
}
