import type { ReactNode } from "react"
import type { DocsEntry } from "@/lib/docs-catalog"
import { entryBadgeLabel } from "@/lib/docs-catalog"
import { Badge } from "@/components/ui/badge"
import { DocsPageToolbarSlot } from "@/components/docs/docs-page-toolbar"
import { newMarkerParentClassName } from "@/components/new-marker"
import { cn } from "@/lib/utils"

type DocsPageHeaderProps = {
  entry: DocsEntry
  /** Override the catalog title (sidebar label stays `entry.title`). */
  title?: string
  /** Override the catalog one-line intro. */
  description?: string
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
 * Shared docs hero: title + one-line intro + badge. Breadcrumb / Prev / Next
 * live in persistent chrome on docs routes (`DocsPageToolbarSlot` no-ops there).
 * Relationship badges, install, and get-data snippets live in body sections.
 */
export const DocsPageHeader = ({
  entry,
  title,
  description,
  isNew = false,
  notice,
}: DocsPageHeaderProps) => {
  const badge = entryBadgeLabel(entry)

  return (
    <header className="mb-8 space-y-4">
      <DocsPageToolbarSlot entry={entry} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1
            className={cn(
              "tfl-title text-3xl text-foreground",
              isNew &&
                newMarkerParentClassName("inline-block pr-7 after:-top-1")
            )}
          >
            {title ?? entry.title}
          </h1>
          <p className="mt-2 max-w-prose text-muted-foreground">
            {description ?? entry.description}
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
