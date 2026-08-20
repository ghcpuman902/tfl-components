import type { ReactNode } from "react"
import Link from "next/link"
import type { DocsEntry } from "@/lib/docs-catalog"
import {
  DOCS_GROUPS,
  entryBadgeLabel,
  getAdjacentEntries,
} from "@/lib/docs-catalog"
import { Badge } from "@/components/ui/badge"
import { DocsPageActions } from "@/components/docs/docs-page-actions"
import { newMarkerParentClassName } from "@/components/new-marker"
import { cn } from "@/lib/utils"

type DocsPageHeaderProps = {
  entry: DocsEntry
  /** Compact “new” mark at the top-right of the title. */
  isNew?: boolean
  /** Extra line under the one-sentence intro (WIP notes, calls to action). */
  notice?: ReactNode
  /**
   * @deprecated Snippets belong in the Preview block, not the hero.
   * Kept optional so call sites compile during migration; ignored.
   */
  getDataSnippet?: React.ReactNode
  /**
   * @deprecated Install belongs below Preview; ignored.
   */
  preferPreview?: boolean
}

/**
 * Shared docs hero: breadcrumb + actions, title + one-line intro, single layer badge.
 * Relationship badges, install, and get-data snippets live in body sections — not here.
 */
export const DocsPageHeader = ({
  entry,
  isNew = false,
  notice,
}: DocsPageHeaderProps) => {
  const group = DOCS_GROUPS.find((item) => item.id === entry.group)
  const badge = entryBadgeLabel(entry)
  const { prev, next } = getAdjacentEntries(entry.slug)

  return (
    <header className="mb-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="underline-offset-4 hover:underline">
            Home
          </Link>
          {entry.slug === "components-index" ? (
            <>
              <span aria-hidden> / </span>
              <Link href="/docs" className="underline-offset-4 hover:underline">
                Get started
              </Link>
            </>
          ) : group ? (
            <>
              <span aria-hidden> / </span>
              <span>{group.title}</span>
            </>
          ) : null}
        </p>
        <DocsPageActions prev={prev} next={next} />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1
            className={cn(
              "tfl-title text-3xl text-foreground",
              isNew &&
                newMarkerParentClassName("inline-block pr-7 after:-top-1")
            )}
          >
            {entry.title}
          </h1>
          <p className="mt-2 max-w-prose text-muted-foreground">
            {entry.description}
          </p>
          {notice}
        </div>
        {badge ? (
          <Badge variant="outline" className="mt-1 shrink-0">
            {badge}
          </Badge>
        ) : null}
      </div>
    </header>
  )
}
