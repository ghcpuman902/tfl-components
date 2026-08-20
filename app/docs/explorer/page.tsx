import type { Metadata } from "next"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { DocsReadableWidth } from "@/components/docs/docs-readable-width"
import { ExplorerShell } from "@/components/explorer/explorer-shell"
import { PointsTubeRailFind } from "@/components/explorer/points/tube-rail-panels"
import { PointsBusFind } from "@/components/explorer/points/bus-panels"
import { PointsCycleFind } from "@/components/explorer/points/cycle-panels"
import { PointsRiverFind } from "@/components/explorer/points/river-panels"
import { LinesTubeRailPanel } from "@/components/explorer/lines/tube-rail-panels"
import { LinesBusPanel } from "@/components/explorer/lines/bus-panels"
import { LinesRiverPanel } from "@/components/explorer/lines/river-panels"
import { ExploreBodySkeleton } from "@/components/tfl/page-skeletons"
import { getDocsEntry } from "@/lib/docs-catalog"
import {
  parseExplorerState,
  type ExplorerState,
} from "@/lib/tfl/explorer-url-state"
import { getExplorerCachedArrivals } from "@/lib/tfl/explorer/cached-arrivals"
import { getExplorerTubeRailPoints } from "@/lib/tfl/explorer/points-tube-rail"
import { getExplorerFeaturedBusStops } from "@/lib/tfl/explorer/points-bus"
import { getExplorerFeaturedCycleHireDocks } from "@/lib/tfl/explorer/points-cycle"
import { getExplorerRiverPiers } from "@/lib/tfl/explorer/points-river"
import {
  getExplorerLineDetails,
  getExplorerTubeRailLines,
} from "@/lib/tfl/explorer/lines-tube-rail"
import { getExplorerBusLines } from "@/lib/tfl/explorer/lines-bus"
import { getExplorerRiverLines } from "@/lib/tfl/explorer/lines-river"
import { HOME_RIVER_STOP } from "@/lib/tfl/home-arrivals-stops"
import {
  firstOrMatching,
  firstOrMatchingPoint,
} from "@/lib/tfl/explorer/selection"
import { pageMetadata, ROUTE_PAGE_META } from "@/lib/site-metadata"

export const metadata: Metadata = pageMetadata(ROUTE_PAGE_META.explorer)

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Kind × domain panels. Directories may be sync (offline topology) or
 * awaited cached seeds. Per-entity route / arrivals / status are Promises
 * unwrapped in the inspector — see docs/explorer-inspector-streaming.md.
 */
function ExplorerTubeRailPointsPanel({ state }: { state: ExplorerState }) {
  const stations = getExplorerTubeRailPoints()
  const seed = stations[0]
  const selected = firstOrMatchingPoint(stations, state.id)
  const cachedArrivalsPromise =
    seed && selected?.id === seed.id
      ? getExplorerCachedArrivals(seed.id, seed.displayName)
      : undefined
  return (
    <PointsTubeRailFind
      state={state}
      stations={stations}
      cachedArrivalsPromise={cachedArrivalsPromise}
    />
  )
}

function ExplorerTubeRailLinesPanel({ state }: { state: ExplorerState }) {
  const lines = getExplorerTubeRailLines()
  const seed = lines[0]
  const selected = firstOrMatching(lines, state.id)
  // Only the seed line gets a free site-key preview; other lines need the
  // visitor's own key (see docs/tfl-user-credentials-design.md §4/§7).
  const detailsPromise =
    seed && selected?.id === seed.id
      ? getExplorerLineDetails(selected.id, state.dir)
      : null
  return (
    <LinesTubeRailPanel
      state={state}
      lines={lines}
      detailsPromise={detailsPromise}
    />
  )
}

function ExplorerActivePanel({ state }: { state: ExplorerState }) {
  if (state.kind === "points" && state.domain === "tube-rail") {
    return <ExplorerTubeRailPointsPanel state={state} />
  }

  if (state.kind === "lines" && state.domain === "tube-rail") {
    return <ExplorerTubeRailLinesPanel state={state} />
  }

  return <ExplorerActivePanelAsync state={state} />
}

async function ExplorerActivePanelAsync({ state }: { state: ExplorerState }) {
  if (state.kind === "points" && state.domain === "bus") {
    const featured = await getExplorerFeaturedBusStops()
    const seed = featured.stops[0]
    const selected = firstOrMatching(featured.stops, state.id)
    const cachedArrivalsPromise =
      seed && selected?.id === seed.id
        ? getExplorerCachedArrivals(seed.id, seed.name)
        : undefined
    return (
      <PointsBusFind
        state={state}
        stops={featured.stops}
        cachedArrivalsPromise={cachedArrivalsPromise}
      />
    )
  }

  if (state.kind === "points" && state.domain === "river") {
    const piers = await getExplorerRiverPiers()
    const seed =
      piers.find((pier) => pier.id === HOME_RIVER_STOP.id) ?? piers[0]
    const selected = firstOrMatching(piers, state.id)
    const cachedArrivalsPromise =
      seed && selected?.id === seed.id
        ? getExplorerCachedArrivals(seed.id, seed.name)
        : undefined
    return (
      <PointsRiverFind
        state={state}
        piers={piers}
        cachedArrivalsPromise={cachedArrivalsPromise}
      />
    )
  }

  if (state.kind === "points" && state.domain === "cycle") {
    const featured = await getExplorerFeaturedCycleHireDocks()
    return <PointsCycleFind state={state} docks={featured.docks} />
  }

  if (state.kind === "lines" && state.domain === "bus") {
    const lines = await getExplorerBusLines()
    const seed = lines[0]
    const selected = firstOrMatching(lines, state.id)
    // Seed-only free preview — bus has hundreds of routes, so gating every
    // other selection behind the visitor's key keeps the shared key's
    // 500 req/min ceiling from fanning out across the whole directory.
    const detailsPromise =
      seed && selected?.id === seed.id
        ? getExplorerLineDetails(selected.id, state.dir)
        : null
    return (
      <LinesBusPanel
        state={state}
        lines={lines}
        detailsPromise={detailsPromise}
      />
    )
  }

  if (state.kind === "lines" && state.domain === "river") {
    const lines = getExplorerRiverLines()
    const seed = lines[0]
    const selected = firstOrMatching(lines, state.id)
    const detailsPromise =
      seed && selected?.id === seed.id
        ? getExplorerLineDetails(selected.id, state.dir)
        : null
    return (
      <LinesRiverPanel
        state={state}
        lines={lines}
        detailsPromise={detailsPromise}
      />
    )
  }

  return null
}

async function ExplorerFromParams({ searchParams }: PageProps) {
  const params = await searchParams
  const state = parseExplorerState(params)

  return (
    <ExplorerShell state={state}>
      <Suspense
        key={`${state.kind}:${state.domain}`}
        fallback={<ExploreBodySkeleton />}
      >
        <ExplorerActivePanel state={state} />
      </Suspense>
    </ExplorerShell>
  )
}

export default function DocsExplorerPage({ searchParams }: PageProps) {
  const entry = getDocsEntry("explore-index")
  if (!entry) notFound()

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <DocsPageHeader entry={entry} />

        <Suspense fallback={<ExploreBodySkeleton />}>
          <ExplorerFromParams searchParams={searchParams} />
        </Suspense>
      </article>
    </DocsReadableWidth>
  )
}
