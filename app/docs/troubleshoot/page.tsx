import type { Metadata } from "next"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { getDocsEntry } from "@/lib/docs-catalog"

export const metadata: Metadata = {
  title: "Troubleshoot",
  description:
    "Set up Next.js or Vite, fix an empty board, and why this can differ from TfL Go.",
}

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
