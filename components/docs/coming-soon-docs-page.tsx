import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { getDocsEntry, type DocsEntry } from "@/lib/docs-catalog"
import { pageMetadata } from "@/lib/site-metadata"

type ComingSoonPageProps = {
  slug: string
}

export const comingSoonMetadata = (slug: string): Metadata => {
  const entry = getDocsEntry(slug)
  if (!entry) {
    return pageMetadata({
      title: "Coming soon",
      description: "This page is not built yet.",
      path: "/docs",
      robots: { index: false, follow: false },
    })
  }
  return pageMetadata({
    title: entry.title,
    description: entry.description,
    path: entry.href.split("?")[0]!,
    robots: { index: false, follow: true },
  })
}

export const ComingSoonDocsPage = ({ slug }: ComingSoonPageProps) => {
  const entry = getDocsEntry(slug)
  if (!entry) notFound()

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <DocsPageHeader entry={entry as DocsEntry} />
        <p className="max-w-prose text-muted-foreground">
          Not built yet. Use the boards that already ship on{" "}
          <Link
            href="/docs/components"
            className="text-foreground underline underline-offset-4"
          >
            Components
          </Link>
          .
        </p>
      </article>
    </DocsReadableWidth>
  )
}
