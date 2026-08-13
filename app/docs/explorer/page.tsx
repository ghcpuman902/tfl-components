import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { ExplorerShell } from "@/components/explorer/explorer-shell";
import { PointsTubeRailFind } from "@/components/explorer/points/tube-rail-panels";
import { PointsBusFind } from "@/components/explorer/points/bus-panels";
import { PointsCycleFind } from "@/components/explorer/points/cycle-panels";
import { LinesTubeRailPanel } from "@/components/explorer/lines/tube-rail-panels";
import { LinesBusPanel } from "@/components/explorer/lines/bus-panels";
import { ExploreBodySkeleton } from "@/components/tfl/page-skeletons";
import { getDocsEntry } from "@/lib/docs-catalog";
import {
  parseExplorerState,
  type ExplorerState,
} from "@/lib/tfl/explorer-url-state";
import { getExplorerCachedArrivals } from "@/lib/tfl/explorer/cached-arrivals";
import { getExplorerTubeRailPoints } from "@/lib/tfl/explorer/points-tube-rail";
import { getExplorerFeaturedBusStops } from "@/lib/tfl/explorer/points-bus";
import { getExplorerFeaturedCycleHireDocks } from "@/lib/tfl/explorer/points-cycle";
import {
  getExplorerLineDetails,
  getExplorerTubeRailLines,
} from "@/lib/tfl/explorer/lines-tube-rail";
import { getExplorerBusLines } from "@/lib/tfl/explorer/lines-bus";
import {
  firstOrMatching,
  firstOrMatchingPoint,
} from "@/lib/tfl/explorer/selection";

export const metadata: Metadata = {
  title: "Explorer",
  description:
    "Developer-facing TfL information model — Points and Lines, with cached examples and keyed live search.",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Kind × domain panels. Directories may be sync (offline topology) or
 * awaited cached seeds. Per-entity route / arrivals / status are Promises
 * unwrapped in the inspector — see docs/explorer-inspector-streaming.md.
 */
function ExplorerTubeRailPointsPanel({ state }: { state: ExplorerState }) {
  const stations = getExplorerTubeRailPoints();
  const seed = stations[0];
  const selected = firstOrMatchingPoint(stations, state.id);
  const cachedArrivalsPromise =
    seed && selected?.id === seed.id
      ? getExplorerCachedArrivals(seed.id, seed.displayName)
      : undefined;
  return (
    <PointsTubeRailFind
      state={state}
      stations={stations}
      cachedArrivalsPromise={cachedArrivalsPromise}
    />
  );
}

function ExplorerTubeRailLinesPanel({ state }: { state: ExplorerState }) {
  const lines = getExplorerTubeRailLines();
  const selected = firstOrMatching(lines, state.id);
  const detailsPromise = selected
    ? getExplorerLineDetails(selected.id, state.dir)
    : null;
  return (
    <LinesTubeRailPanel
      state={state}
      lines={lines}
      detailsPromise={detailsPromise}
    />
  );
}

function ExplorerActivePanel({ state }: { state: ExplorerState }) {
  if (state.kind === "points" && state.domain === "tube-rail") {
    return <ExplorerTubeRailPointsPanel state={state} />;
  }

  if (state.kind === "lines" && state.domain === "tube-rail") {
    return <ExplorerTubeRailLinesPanel state={state} />;
  }

  return <ExplorerActivePanelAsync state={state} />;
}

async function ExplorerActivePanelAsync({ state }: { state: ExplorerState }) {
  if (state.kind === "points" && state.domain === "bus") {
    const featured = await getExplorerFeaturedBusStops();
    const seed = featured.stops[0];
    const selected = firstOrMatching(featured.stops, state.id);
    const cachedArrivalsPromise =
      seed && selected?.id === seed.id
        ? getExplorerCachedArrivals(seed.id, seed.name)
        : undefined;
    return (
      <PointsBusFind
        state={state}
        stops={featured.stops}
        label={featured.label}
        radiusMeters={featured.radiusMeters}
        cachedArrivalsPromise={cachedArrivalsPromise}
      />
    );
  }

  if (state.kind === "points" && state.domain === "cycle") {
    const featured = await getExplorerFeaturedCycleHireDocks();
    return (
      <PointsCycleFind
        state={state}
        docks={featured.docks}
        label={featured.label}
        radiusMeters={featured.radiusMeters}
      />
    );
  }

  if (state.kind === "lines" && state.domain === "bus") {
    const lines = await getExplorerBusLines();
    const selected = firstOrMatching(lines, state.id);
    const detailsPromise = selected
      ? getExplorerLineDetails(selected.id, state.dir)
      : null;
    return (
      <LinesBusPanel
        state={state}
        lines={lines}
        detailsPromise={detailsPromise}
      />
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      River modes are on the roadmap.
    </p>
  );
}

async function ExplorerFromParams({ searchParams }: PageProps) {
  const params = await searchParams;
  const state = parseExplorerState(params);

  return (
    <ExplorerShell state={state}>
      <Suspense
        key={`${state.kind}:${state.domain}`}
        fallback={<ExploreBodySkeleton />}
      >
        <ExplorerActivePanel state={state} />
      </Suspense>
    </ExplorerShell>
  );
}

export default function DocsExplorerPage({ searchParams }: PageProps) {
  const entry = getDocsEntry("explore-index");
  if (!entry) notFound();

  return (
    <DocsReadableWidth>
      <article className="space-y-8">
        <DocsPageHeader entry={entry} />

        <section className="space-y-2">
          <p className="max-w-prose text-muted-foreground text-pretty">
            Discover TfL identities and relationships — Points and Lines —
            without mirroring the Unified API endpoint taxonomy. The first
            cached example opens in the inspector; Search, Locate, and other
            live previews use your own TfL API key.
          </p>
        </section>

        <Suspense fallback={<ExploreBodySkeleton />}>
          <ExplorerFromParams searchParams={searchParams} />
        </Suspense>
      </article>
    </DocsReadableWidth>
  );
}
