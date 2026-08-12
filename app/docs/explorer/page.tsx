import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { ExplorerShell } from "@/components/explorer/explorer-shell";
import {
  PointsTubeRailBrowse,
  PointsTubeRailFind,
} from "@/components/explorer/points/tube-rail-panels";
import {
  PointsBusBrowse,
  PointsBusFind,
} from "@/components/explorer/points/bus-panels";
import {
  PointsCycleBrowse,
  PointsCycleFind,
} from "@/components/explorer/points/cycle-panels";
import {
  LinesTubeRailBrowse,
  LinesTubeRailFind,
} from "@/components/explorer/lines/tube-rail-panels";
import {
  LinesBusBrowse,
  LinesBusFind,
} from "@/components/explorer/lines/bus-panels";
import { ExploreBodySkeleton } from "@/components/tfl/page-skeletons";
import { getDocsEntry } from "@/lib/docs-catalog";
import {
  parseExplorerState,
  type ExplorerState,
} from "@/lib/tfl/explorer-url-state";
import { getExplorerTubeRailPoints } from "@/lib/tfl/explorer/points-tube-rail";
import { getExplorerFeaturedBusStops } from "@/lib/tfl/explorer/points-bus";
import { getExplorerFeaturedCycleHireDocks } from "@/lib/tfl/explorer/points-cycle";
import {
  getExplorerLineRoute,
  getExplorerTubeRailLineGroups,
} from "@/lib/tfl/explorer/lines-tube-rail";
import { getExplorerCuratedBusLines } from "@/lib/tfl/explorer/lines-bus";
import { getCachedLineStatuses } from "@/lib/tfl/status-data";

export const metadata: Metadata = {
  title: "Explorer",
  description:
    "Developer-facing TfL information model — Points and Lines, Browse and Find.",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function ExplorerActivePanel({ state }: { state: ExplorerState }) {
  if (state.kind === "points" && state.domain === "tube-rail") {
    if (state.tab === "find") {
      return <PointsTubeRailFind state={state} />;
    }
    const stations = await getExplorerTubeRailPoints();
    return <PointsTubeRailBrowse state={state} stations={stations} />;
  }

  if (state.kind === "points" && state.domain === "bus") {
    if (state.tab === "find") {
      return <PointsBusFind state={state} />;
    }
    const featured = await getExplorerFeaturedBusStops();
    return (
      <PointsBusBrowse
        state={state}
        stops={featured.stops}
        label={featured.label}
        radiusMeters={featured.radiusMeters}
      />
    );
  }

  if (state.kind === "points" && state.domain === "cycle") {
    if (state.tab === "find") {
      return <PointsCycleFind state={state} />;
    }
    const featured = await getExplorerFeaturedCycleHireDocks();
    return (
      <PointsCycleBrowse
        state={state}
        docks={featured.docks}
        label={featured.label}
        radiusMeters={featured.radiusMeters}
      />
    );
  }

  if (state.kind === "lines" && state.domain === "tube-rail") {
    if (state.tab === "find") {
      return <LinesTubeRailFind state={state} />;
    }
    const groups = await getExplorerTubeRailLineGroups();
    const selectedId = state.id;
    const [route, statuses] = selectedId
      ? await Promise.all([
          getExplorerLineRoute(selectedId, state.dir),
          getCachedLineStatuses([selectedId]),
        ])
      : [null, []];

    return (
      <LinesTubeRailBrowse
        state={state}
        groups={groups}
        route={route}
        status={statuses[0] ?? null}
      />
    );
  }

  if (state.kind === "lines" && state.domain === "bus") {
    if (state.tab === "find") {
      return <LinesBusFind state={state} />;
    }
    const lines = await getExplorerCuratedBusLines();
    const route = state.id
      ? await getExplorerLineRoute(state.id, state.dir)
      : null;
    return <LinesBusBrowse state={state} lines={lines} route={route} />;
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
        key={`${state.kind}:${state.domain}:${state.tab}`}
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
            without mirroring the Unified API endpoint taxonomy. Browse known
            entities for free; Find runs live queries with your own key.
          </p>
        </section>

        <Suspense fallback={<ExploreBodySkeleton />}>
          <ExplorerFromParams searchParams={searchParams} />
        </Suspense>
      </article>
    </DocsReadableWidth>
  );
}
