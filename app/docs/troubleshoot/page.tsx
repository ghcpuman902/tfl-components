import type { Metadata } from "next"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { getDocsEntry } from "@/lib/docs-catalog"
import { docsEntryMetadata } from "@/lib/site-metadata"

export const metadata: Metadata = docsEntryMetadata("troubleshoot")

export default async function DocsTroubleshootPage() {
  const entry = getDocsEntry("troubleshoot")!
  const { default: MDXPage } = await import("@/content/troubleshoot.mdx")

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <DocsPageHeader entry={entry} />
        <div className="docs-mdx [&_h2+p]:mt-3 [&_h3+p]:mt-2 [&_h4+p]:mt-2 [&_p+p]:mt-4">
          <MDXPage />
        </div>
      </article>
    </DocsReadableWidth>
  )
}
