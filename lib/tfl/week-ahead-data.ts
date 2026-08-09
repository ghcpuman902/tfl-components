import { cacheLife, cacheTag } from "next/cache";
import { getLineColor } from "tfl-ts";
import { getTflClient } from "@/lib/tfl/client";
import { toDiagramStation } from "@/lib/tfl/diagram-mappers";
import type { DiagramStation } from "@/lib/tfl/diagram-station";
import type { LondonDay } from "@/lib/tfl/london-dates";
import { getStaticLineSpine } from "@/lib/tfl/static-line-spines";
import {
  selectLongestOrderedRoute,
  WEEK_AHEAD_LINE_IDS,
  type LineStatusLike,
  type WeekAheadLineId,
} from "@/lib/tfl/week-ahead-status";

export type WeekAheadLineRoute = {
  lineId: WeekAheadLineId;
  lineName: string;
  lineColor: string;
  stations: DiagramStation[];
  spineIds: string[];
  routeError?: string;
};

export type WeekAheadLineStatuses = {
  lineId: WeekAheadLineId;
  statuses: LineStatusLike[];
};

export type WeekAheadStatusPayload = {
  statusesByLineId: Record<string, LineStatusLike[]>;
  statusError?: string;
};

export type WeekAheadRoutesPayload = {
  routes: WeekAheadLineRoute[];
};

type StopPoolItem = {
  id?: string | null;
  name?: string | null;
  lines?: { id?: string | null; name?: string | null }[] | null;
  modes?: string[] | null;
};

const stationsFromOrderedIds = (
  orderedIds: readonly string[],
  byId: Map<string, StopPoolItem>,
  lineId: string,
): DiagramStation[] =>
  orderedIds.map((id) => {
    const stop = byId.get(id);
    if (stop) {
      const station = toDiagramStation(stop, lineId);
      return { ...station, connections: undefined };
    }
    return { id, name: id, interchange: false };
  });

const buildFromStaticSpine = async (
  lineId: WeekAheadLineId,
  color: string,
): Promise<WeekAheadLineRoute | null> => {
  const staticSpine = getStaticLineSpine(lineId);
  if (!staticSpine) return null;

  const client = getTflClient();
  try {
    const stops = await client.line.getStopPoints(lineId);
    const byId = new Map<string, StopPoolItem>();
    for (const stop of stops) {
      const id = stop.id ?? stop.naptanId;
      if (!id) continue;
      byId.set(id, {
        id,
        name: stop.commonName ?? id,
        lines: stop.lines,
        modes: stop.modes,
      });
    }
    const stations = stationsFromOrderedIds(
      staticSpine.naptanIds,
      byId,
      lineId,
    );
    return {
      lineId,
      lineName: staticSpine.lineName,
      lineColor: color,
      stations,
      spineIds: stations.map((s) => s.id),
    };
  } catch {
    const stations = staticSpine.naptanIds.map((id) => ({ id, name: id }));
    return {
      lineId,
      lineName: staticSpine.lineName,
      lineColor: color,
      stations,
      spineIds: [...staticSpine.naptanIds],
    };
  }
};

/**
 * Live detailed status for the displayed date range.
 * Cached ~60s — separate from route geometry.
 */
export async function getCachedWeekAheadStatuses(
  startDate: string,
  endDate: string,
): Promise<WeekAheadStatusPayload> {
  "use cache";
  cacheLife({ revalidate: 60 });
  cacheTag("tfl-line-status", "tfl-week-ahead-status");

  const client = getTflClient();
  try {
    const lines = await client.line.getStatus({
      lineIds: [...WEEK_AHEAD_LINE_IDS],
      dateRange: { startDate, endDate },
      detail: true,
    });

    const byId = new Map(
      lines
        .filter((line) => line.id)
        .map((line) => [line.id!, line] as const),
    );

    const statusesByLineId: Record<string, LineStatusLike[]> = {};
    for (const lineId of WEEK_AHEAD_LINE_IDS) {
      statusesByLineId[lineId] = (byId.get(lineId)?.lineStatuses ??
        []) as LineStatusLike[];
    }

    return { statusesByLineId };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load live status";
    return { statusesByLineId: {}, statusError: message };
  }
}

export async function getCachedLineRoute(
  lineId: WeekAheadLineId,
): Promise<WeekAheadLineRoute> {
  "use cache";
  cacheLife({ revalidate: 3600 });
  cacheTag("tfl-route", `tfl-route-${lineId}-outbound`, "tfl-week-ahead-routes");

  const client = getTflClient();
  const color = getLineColor(lineId).hex;

  // Prefer static spine when we have one — avoids waiting on a flaky empty sequence.
  const staticFirst = getStaticLineSpine(lineId);
  if (staticFirst) {
    const fromStatic = await buildFromStaticSpine(lineId, color);
    if (fromStatic && fromStatic.stations.length > 0) return fromStatic;
  }

  try {
    const loadSequence = async (direction: "inbound" | "outbound") =>
      client.line.getRouteSequence({ id: lineId, direction });

    let sequence = await loadSequence("outbound");
    let spine = selectLongestOrderedRoute(sequence.orderedLineRoutes);

    if (!spine?.naptanIds?.length) {
      const inbound = await loadSequence("inbound");
      const inboundSpine = selectLongestOrderedRoute(inbound.orderedLineRoutes);
      if ((inboundSpine?.naptanIds?.length ?? 0) > (spine?.naptanIds?.length ?? 0)) {
        sequence = inbound;
        spine = inboundSpine;
      }
    }

    const orderedIds = spine?.naptanIds ?? [];
    const fromSequences =
      sequence.stopPointSequences?.flatMap((seq) => seq.stopPoint ?? []) ?? [];
    const stopPool: StopPoolItem[] =
      fromSequences.length > 0 ? fromSequences : (sequence.stations ?? []);

    const byId = new Map<string, StopPoolItem>();
    for (const stop of stopPool) {
      if (stop.id) byId.set(stop.id, stop);
    }

    let stations: DiagramStation[] = [];
    if (orderedIds.length > 0) {
      stations = stationsFromOrderedIds(orderedIds, byId, lineId);
    } else if (stopPool.length > 0) {
      const seen = new Set<string>();
      stations = stopPool
        .filter((stop) => {
          const id = stop.id ?? stop.name ?? "";
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        })
        .map((stop) => {
          const station = toDiagramStation(stop, lineId);
          return { ...station, connections: undefined };
        });
    }

    if (stations.length === 0) {
      const fallback = await buildFromStaticSpine(lineId, color);
      if (fallback) return fallback;
    }

    return {
      lineId,
      lineName:
        sequence.lineName ?? getStaticLineSpine(lineId)?.lineName ?? lineId,
      lineColor: color,
      stations,
      spineIds: stations.map((s) => s.id),
      routeError:
        stations.length === 0
          ? "TfL returned no stop sequence for this line"
          : undefined,
    };
  } catch (error) {
    const fallback = await buildFromStaticSpine(lineId, color);
    if (fallback) return fallback;

    return {
      lineId,
      lineName: lineId,
      lineColor: color,
      stations: [],
      spineIds: [],
      routeError:
        error instanceof Error ? error.message : "Could not load route",
    };
  }
}

/**
 * Route geometry only — long cache, independent of live status.
 * Fetches all lines concurrently.
 */
export async function getCachedWeekAheadRoutes(): Promise<WeekAheadRoutesPayload> {
  "use cache";
  cacheLife({ revalidate: 3600 });
  cacheTag("tfl-route", "tfl-week-ahead-routes");

  const routes = await Promise.all(
    WEEK_AHEAD_LINE_IDS.map((lineId) => getCachedLineRoute(lineId)),
  );

  return { routes };
}

export type { LondonDay };
