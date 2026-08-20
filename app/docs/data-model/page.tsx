import type { Metadata } from "next"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { getDocsEntry } from "@/lib/docs-catalog"

export const metadata: Metadata = {
  title: "Data model",
  description:
    "The shared passenger network behind maps and line diagrams — a small derived set, not a full timetable.",
}

export default async function DocsDataModelPage() {
  const entry = getDocsEntry("data-model")!
  const { default: MDXPage } = await import("@/content/data-model.mdx")

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
