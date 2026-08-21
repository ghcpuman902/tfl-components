import { Suspense } from "react"
import { PointsTubeRailFind } from "@/components/explorer/points/tube-rail-panels"
import { PointsBusFind } from "@/components/explorer/points/bus-panels"
import { PointsCycleFind } from "@/components/explorer/points/cycle-panels"
import { PointsRiverFind } from "@/components/explorer/points/river-panels"
import { LinesTubeRailPanel } from "@/components/explorer/lines/tube-rail-panels"
import { LinesBusPanel } from "@/components/explorer/lines/bus-panels"
import { LinesRiverPanel } from "@/components/explorer/lines/river-panels"
import { ExploreBodySkeleton } from "@/components/tfl/page-skeletons"
import {
  domainsForKind,
  parseExplorerPath,
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
import {
  explorerIdsEqual,
  firstOrMatching,
  firstOrMatchingPoint,
  pointMatchesId,
} from "@/lib/tfl/explorer/selection"

type PageProps = {
  params: Promise<{ segments?: string[] }>
}

/**
 * Kind × domain panels. Directories may be sync (offline topology) or
 * awaited cached seeds. Per-entity route / arrivals / status are Promises
 * unwrapped in the inspector — see docs/explorer-inspector-streaming.md.
 */
function ExplorerTubeRailPointsPanel({ state }: { state: ExplorerState }) {
  const stations = getExplorerTubeRailPoints()
  const selected = firstOrMatchingPoint(stations, state.id)
  const inDirectory =
    selected != null &&
    (state.id == null || pointMatchesId(selected, state.id))
  const cachedArrivalsPromise =
    inDirectory
      ? getExplorerCachedArrivals(selected.id, selected.displayName)
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
  const selected = firstOrMatching(lines, state.id)
  const detailsPromise = selected
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
    const selected = firstOrMatching(featured.stops, state.id)
    const inDirectory =
      selected != null &&
      (state.id == null || explorerIdsEqual(selected.id, state.id))
    const cachedArrivalsPromise =
      inDirectory
        ? getExplorerCachedArrivals(selected.id, selected.name)
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
    const selected = firstOrMatching(piers, state.id)
    const inDirectory =
      selected != null &&
      (state.id == null || explorerIdsEqual(selected.id, state.id))
    const cachedArrivalsPromise =
      inDirectory
        ? getExplorerCachedArrivals(selected.id, selected.name)
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
    const selected = firstOrMatching(lines, state.id)
    const detailsPromise = selected
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
    const selected = firstOrMatching(lines, state.id)
    const detailsPromise = selected
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

export function generateStaticParams() {
  return [
    { segments: [] },
    ...(["points", "lines"] as const).flatMap((kind) => [
      { segments: [kind] },
      ...domainsForKind(kind).map((domain) => ({
        segments: [kind, domain],
      })),
    ]),
  ]
}

export default function DocsExplorerPage({ params }: PageProps) {
  return (
    <Suspense fallback={<ExploreBodySkeleton />}>
      <DocsExplorerFromParams params={params} />
    </Suspense>
  )
}

async function DocsExplorerFromParams({ params }: PageProps) {
  const { segments } = await params
  const state = parseExplorerPath(segments ?? [])

  return (
    <Suspense
      key={`${state.kind}:${state.domain}`}
      fallback={<ExploreBodySkeleton />}
    >
      <ExplorerActivePanel state={state} />
    </Suspense>
  )
}
