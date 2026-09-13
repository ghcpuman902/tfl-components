import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense, type ComponentType, type ReactNode } from "react"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { InstallCommand } from "@/components/docs/install-command"
import { CompactInstallButton } from "@/components/docs/compact-install-button"
import { RelationshipBadges } from "@/components/docs/relationship-badges"
import {
  getContentAssetSlug,
  getDocsEntry,
  getUsedBySlugs,
  type DocsEntry,
} from "@/lib/docs-catalog"
import { docsEntryMetadata } from "@/lib/site-metadata"
import { loadComponentDemo } from "@/lib/load-component-demo"
import { SyntaxHighlightedCode } from "@/components/docs/syntax-highlighted-code"
import { TubeStatusBoardSkeleton } from "@/components/tfl/status/tube-status-board"
import { RailArrivalsBoardSkeleton } from "@/components/tfl/arrivals/rail-arrivals-board"
import { BusArrivalsBoardSkeleton } from "@/components/tfl/arrivals/bus-arrivals-board"
import { RiverBusArrivalsBoardSkeleton } from "@/components/tfl/arrivals/river-bus-arrivals-board"
import { CycleHireDocksBoardSkeleton } from "@/components/tfl/cycle-hire/cycle-hire-docks"
import {
  HOME_BUS_STOP,
  HOME_RAIL_STOP,
  HOME_RIVER_STOP,
} from "@/lib/tfl/home-arrivals-stops"

type RelatedLink = { href: string; label: string }

type RenderComponentDocsOptions = {
  /** Catalog slug (also MDX / demo filename). */
  slug: string
  /** Extra related links under the MDX body. */
  relatedLinks?: readonly RelatedLink[]
  /** Compact get-data → render example for data-aware pages. */
  getDataExample?: string
  /** Optional WIP / caveat under the one-sentence intro. */
  notice?: ReactNode
}

const PREVIEW_SNIPPETS: Record<string, string> = {
  "tube-status-board": `const fetchedAt = Date.now()
const data = sortLinesBySeverityAndOrder(
  await tfl.line.getStatus({ modes: ["tube", "elizabeth-line"] }),
  { now: fetchedAt },
)

<TubeStatusBoard data={data} now={fetchedAt} />`,
  "arrivals-board": `const data = await tfl.stopPoint.getArrivals({
  stopPointIds: ["940GZZLUOXC"],
  sortBy: "timeToStation",
})

<RailArrivalsBoard data={data} stopName="Oxford Circus" />`,
  "rail-arrivals-board": `const data = await tfl.stopPoint.getArrivals({
  stopPointIds: ["940GZZLUOXC"],
  sortBy: "timeToStation",
})

<RailArrivalsBoard data={data} stopName="Oxford Circus" />`,
  "cycle-hire-docks": `const data = await Promise.all([
  tfl.bikePoint.getById("BikePoints_237"),
  tfl.bikePoint.getById("BikePoints_490"),
  tfl.bikePoint.getById("BikePoints_46"),
])

<CycleHireDocksBoard data={data} />`,
  "line-strip": `const spine = await getLineSpine("victoria")

<LineStrip lineId="victoria" spine={spine} fit />`,
  "branch-strip-horizontal": `import { BranchStripHorizontal } from "@/components/tfl/diagram/branch-strip-horizontal"

<BranchStripHorizontal
  schematic={schematic}
  lineColor={lineColor}
/>`,
  "branch-strip-vertical": `import { BranchStripVertical } from "@/components/tfl/diagram/branch-strip-vertical"

<BranchStripVertical
  schematic={schematic}
  lineColor={lineColor}
/>`,
  "map-geographic": `import { TflGeographicMap } from "@/components/tfl/geography/tfl-geographic-map"

<div className="h-100">
  <TflGeographicMap />
</div>`,
  "map-bus-geo": `import { TflBusGeoMap } from "@/components/tfl/geography/tfl-bus-geo-map"

<div className="h-100">
  <TflBusGeoMap data={route} />
</div>`,
  "line-badge": `import { LineBadge, LineColorBar } from "@/components/tfl/brand/line-badge"

<LineBadge lineId="victoria" name="Victoria" />
<LineColorBar lineId="victoria" heightClass="h-[6px]" />`,
  "line-name": `import { LineName } from "@/components/tfl/brand/line-name"

<LineName lineId="hammersmith-city" />
<LineName lineIds={["circle", "hammersmith-city", "metropolitan"]} group />`,
  "platform-chip": `import { PlatformChip } from "@/components/tfl/arrivals/platform-chip"

<div className="@container/arrivals">
  <PlatformChip number="4" />
</div>`,
}

const RailDocsPreviewFallback = () => (
  <RailArrivalsBoardSkeleton stopName={HOME_RAIL_STOP.name} />
)

const BusDocsPreviewFallback = () => (
  <BusArrivalsBoardSkeleton
    stopName={HOME_BUS_STOP.name}
    stopLetter={HOME_BUS_STOP.stopLetter}
  />
)

const RiverDocsPreviewFallback = () => (
  <RiverBusArrivalsBoardSkeleton stopName={HOME_RIVER_STOP.name} />
)

const LineStripDocsPreviewFallback = () => (
  <div
    className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6"
    aria-busy="true"
  >
    <p className="text-sm text-muted-foreground">Loading route sequence</p>
    <div className="relative h-28 overflow-hidden" aria-hidden>
      <div className="absolute inset-x-6 top-14 h-1 rounded-full bg-muted" />
      <div className="absolute inset-x-6 top-[3.125rem] flex justify-between">
        {Array.from({ length: 7 }, (_, index) => (
          <span
            key={index}
            className="size-3 animate-pulse rounded-full border-2 border-muted-foreground bg-background"
          />
        ))}
      </div>
      <div className="absolute inset-x-4 top-20 flex justify-between">
        {Array.from({ length: 4 }, (_, index) => (
          <span
            key={index}
            className="h-3 w-14 animate-pulse rounded bg-muted"
          />
        ))}
      </div>
    </div>
  </div>
)

const PREVIEW_FALLBACKS: Record<string, ComponentType> = {
  "tube-status-board": TubeStatusBoardSkeleton,
  "rail-arrivals-board": RailDocsPreviewFallback,
  "bus-arrivals-board": BusDocsPreviewFallback,
  "river-bus-arrivals": RiverDocsPreviewFallback,
  "cycle-hire-docks": CycleHireDocksBoardSkeleton,
  "line-strip": LineStripDocsPreviewFallback,
}

const DocsPreviewFallback = ({ slug }: { slug: string }) => {
  const Fallback = PREVIEW_FALLBACKS[slug]
  if (!Fallback) return null
  return <Fallback />
}

const DocsDemoSlot = async ({ slug }: { slug: string }) => {
  const Demo = await loadComponentDemo(slug)
  if (!Demo) return null
  return <Demo />
}

const DocsMdxSlot = async ({ slug }: { slug: string }) => {
  let MDXPage: React.ComponentType<{ className?: string }> | null = null
  try {
    const mod = await import(`@/content/components/${slug}.mdx`)
    MDXPage = mod.default
  } catch {
    if (slug === "bus-arrivals-board") {
      try {
        const mod = await import(`@/content/components/rail-arrivals-board.mdx`)
        MDXPage = mod.default
      } catch {
        MDXPage = null
      }
    }
  }

  if (!MDXPage) return null

  return <MDXPage />
}

export const componentDocsMetadata = async (
  slug: string
): Promise<Metadata> => {
  const entry = getDocsEntry(slug)
  if (!entry || entry.kind !== "component") {
    return { title: "Not found", robots: { index: false, follow: false } }
  }
  return docsEntryMetadata(slug)
}

export const renderComponentDocs = ({
  slug,
  relatedLinks = [],
  getDataExample,
  notice,
}: RenderComponentDocsOptions) => {
  const entry = getDocsEntry(slug)
  if (!entry || entry.kind !== "component") notFound()

  const contentSlug = getContentAssetSlug(slug)
  const snippet =
    getDataExample ?? PREVIEW_SNIPPETS[contentSlug] ?? PREVIEW_SNIPPETS[slug]
  const usedBy = getUsedBySlugs(entry.slug)

  return (
    <DocsReadableWidth>
      <article className="space-y-14">
        <DocsPageHeader entry={entry as DocsEntry} notice={notice} />
        <RelationshipBadges
          builtWith={entry.builtWith}
          usesFoundations={entry.usesFoundations}
          usedBy={usedBy}
        />

        <section className="space-y-6" aria-labelledby="preview-heading">
          <div className="space-y-3">
            <h2 id="preview-heading" className="text-lg font-semibold">
              Preview
            </h2>
            <Suspense fallback={<DocsPreviewFallback slug={contentSlug} />}>
              <DocsDemoSlot slug={contentSlug} />
            </Suspense>
          </div>

          {snippet ? (
            <div className="space-y-2">
              <h2 id="usage-heading" className="text-lg font-semibold">
                Usage
              </h2>
              <SyntaxHighlightedCode
                code={snippet}
                language="tsx"
                peekLines={3}
              />
            </div>
          ) : null}

          {entry.registryUrl ? (
            <CompactInstallButton registryUrl={entry.registryUrl} />
          ) : null}
        </section>

        {entry.registryUrl ? (
          <section className="space-y-2" aria-labelledby="install-heading">
            <h2 id="install-heading" className="text-lg font-semibold">
              Installation
            </h2>
            <InstallCommand registryUrl={entry.registryUrl} />
          </section>
        ) : null}

        <Suspense fallback={null}>
          {/*
            MDX compiles to a fragment. Without a wrapper those nodes become
            direct `article` children and pick up `space-y-14` between every
            heading and paragraph. Keep major chrome spaced; MDX owns its own.
          */}
          <div className="docs-mdx [&_h2+p]:mt-3 [&_h3+p]:mt-2 [&_h4+p]:mt-2 [&_p+p]:mt-4">
            <DocsMdxSlot slug={contentSlug} />
          </div>
        </Suspense>

        {relatedLinks.length > 0 ? (
          <section className="max-w-prose space-y-2 border-t border-border pt-8">
            <h2 id="in-code" className="text-lg font-semibold">
              In code
            </h2>
            <p className="text-sm text-muted-foreground">
              {relatedLinks.map((link, index) => (
                <span key={link.href}>
                  {index > 0 ? " · " : null}
                  <a
                    href={link.href}
                    className="text-foreground underline-offset-4 hover:underline"
                  >
                    {link.label}
                  </a>
                </span>
              ))}
            </p>
          </section>
        ) : null}
      </article>
    </DocsReadableWidth>
  )
}
