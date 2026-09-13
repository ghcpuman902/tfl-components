"use client"

import { startTransition, useOptimistic } from "react"
import Link from "next/link"
import type { DocsEntry } from "@/lib/docs-catalog"
import {
  DOCS_GROUPS,
  getAdjacentEntries,
  getDocsEntryForPathname,
} from "@/lib/docs-catalog"
import { DocsPageActions } from "@/components/docs/docs-page-actions"
import { useDocsChrome } from "@/components/docs/docs-chrome-context"

type DocsPageToolbarProps = {
  entry: DocsEntry
  onNavigate?: (href: string) => void
}

/** Breadcrumb + Copy / Prev / Next. Persistent on docs routes. */
export const DocsPageToolbar = ({
  entry,
  onNavigate,
}: DocsPageToolbarProps) => {
  const group = DOCS_GROUPS.find((item) => item.id === entry.group)
  const { prev, next } = getAdjacentEntries(entry.slug)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        <Link
          href="/"
          className="touch-manipulation underline-offset-4 [@media(hover:hover)]:hover:underline"
        >
          Home
        </Link>
        {entry.slug === "components-index" ? (
          <>
            <span aria-hidden> / </span>
            <Link
              href="/docs"
              onClick={() => onNavigate?.("/docs")}
              className="touch-manipulation underline-offset-4 [@media(hover:hover)]:hover:underline"
            >
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
      <DocsPageActions prev={prev} next={next} onNavigate={onNavigate} />
    </div>
  )
}

/** In-page toolbar when chrome does not own prev/next (Labs, tools). */
export const DocsPageToolbarSlot = ({ entry }: { entry: DocsEntry }) => {
  const { persistentToolbar } = useDocsChrome()
  if (persistentToolbar) return null
  return <DocsPageToolbar entry={entry} />
}

/**
 * Stays mounted across docs sibling navigations — same idea as the sidebar.
 * Optimistic path updates prev/next on tap; the article streams underneath.
 */
export const DocsPersistentToolbar = ({ pathname }: { pathname: string }) => {
  const [optimisticPath, setOptimisticPath] = useOptimistic(pathname)
  const entry = getDocsEntryForPathname(optimisticPath)
  if (!entry) return null

  const handleNavigate = (href: string) => {
    startTransition(() => {
      setOptimisticPath(href)
    })
  }

  return (
    <div className="mx-auto mb-4 w-full max-w-5xl">
      <DocsPageToolbar entry={entry} onNavigate={handleNavigate} />
    </div>
  )
}
