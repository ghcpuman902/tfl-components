import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { Badge } from "@/components/ui/badge"
import {
  entryBadgeLabel,
  getCatalogueEntries,
  getDocsEntry,
} from "@/lib/docs-catalog"
import { pageMetadata, ROUTE_PAGE_META } from "@/lib/site-metadata"

export const metadata: Metadata = pageMetadata(ROUTE_PAGE_META.components)

/** Bust Next/browser caches when recapturing thumbs that keep the same path. */
const CATALOG_PREVIEW_VERSION = "preview-node-2"

const catalogPreview = (file: string): string =>
  `/images/catalog/${file}.png?v=${CATALOG_PREVIEW_VERSION}`

const CATALOG_PREVIEWS: Partial<Record<string, string>> = {
  "tube-rail-arrivals": catalogPreview("tube-rail-arrivals"),
  "tube-rail-status": catalogPreview("tube-rail-status"),
  "bus-arrivals": catalogPreview("bus-arrivals"),
  "river-bus-arrivals": catalogPreview("river-bus-arrivals"),
  "cycle-hire-docks": catalogPreview("cycle-hire-docks"),
  "maps-geographic": catalogPreview("maps-geographic"),
  "maps-bus": catalogPreview("maps-bus"),
  "live-vehicle-tracking": catalogPreview("live-vehicle-tracking"),
  "live-bus-vehicles": catalogPreview("live-bus-vehicles"),
  "line-strip": catalogPreview("line-strip"),
  "branch-strip-horizontal": catalogPreview("branch-strip-horizontal"),
  "branch-strip-vertical": catalogPreview("branch-strip-vertical"),
  "platform-chip": catalogPreview("platform-chip"),
  "bus-number-chip": catalogPreview("bus-number-chip"),
  "line-title": catalogPreview("line-title"),
  "line-chip": catalogPreview("line-chip"),
}

export default function DocsComponentsCataloguePage() {
  const entry = getDocsEntry("components-index")!
  const items = getCatalogueEntries()

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <DocsPageHeader entry={entry} />

        <section aria-label="Component catalogue">
          <ul className="divide-y divide-border border-y border-border">
            {items.map((item) => {
              const preview = CATALOG_PREVIEWS[item.slug]
              const badge = entryBadgeLabel(item)
              return (
                <li key={item.slug}>
                  <Link
                    href={item.href}
                    className="relative isolate flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 before:pointer-events-none before:absolute before:inset-y-0 before:-inset-x-3 before:-z-10 before:origin-center before:scale-x-[0.95] before:rounded-lg before:bg-muted/40 before:opacity-0 before:transition-[scale,opacity] before:duration-200 before:ease-[cubic-bezier(0.19,1,0.22,1)] before:content-[''] hover:before:scale-x-100 hover:before:opacity-100 focus-visible:before:scale-x-100 focus-visible:before:opacity-100 motion-reduce:before:scale-x-100 motion-reduce:before:duration-150"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">
                          {item.title}
                        </span>
                        {badge ? (
                          <Badge variant="outline">{badge}</Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    {preview ? (
                      <Image
                        src={preview}
                        alt=""
                        width={384}
                        height={216}
                        sizes="192px"
                        unoptimized
                        className="aspect-video w-full max-w-48 shrink-0 rounded-md border border-border object-cover object-top sm:w-48"
                      />
                    ) : (
                      <div
                        className="aspect-video w-full max-w-48 shrink-0 rounded-md border border-dashed border-border bg-muted/40 sm:w-48"
                        aria-hidden
                      />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      </article>
    </DocsReadableWidth>
  )
}
