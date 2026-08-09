/**
 * Pure helpers for the homepage "This week ahead" line status view.
 * Structured TfL fields only — no NLP / regex on disruption prose.
 */

import type { DiagramSegment } from "@/lib/tfl/diagram-station";
import { validityOverlapsDay } from "@/lib/tfl/london-dates";

/** Homepage line order (TfL line IDs). */
export const WEEK_AHEAD_LINE_IDS = [
  "waterloo-city",
  "bakerloo",
  "central",
  "jubilee",
  "northern",
  "piccadilly",
  "district",
  "victoria",
  "circle",
  "hammersmith-city",
  "metropolitan",
  "elizabeth",
  "dlr",
  "liberty",
  "lioness",
  "mildmay",
  "suffragette",
  "weaver",
  "windrush",
  "tram",
] as const;

export type WeekAheadLineId = (typeof WEEK_AHEAD_LINE_IDS)[number];

export type OrderedRouteLike = {
  name?: string;
  naptanIds?: string[];
  serviceType?: string;
};

/**
 * Pick the longest usable orderedLineRoute as the displayed spine.
 * Isolated so branch-aware rendering can replace this later.
 */
export const selectLongestOrderedRoute = (
  routes: OrderedRouteLike[] | null | undefined,
): OrderedRouteLike | null => {
  if (!routes?.length) return null;
  let best: OrderedRouteLike | null = null;
  let bestLen = 0;
  for (const route of routes) {
    const len = route.naptanIds?.length ?? 0;
    if (len > bestLen) {
      best = route;
      bestLen = len;
    }
  }
  return bestLen > 0 ? best : null;
};

export type ServiceRenderKind =
  | "good"
  | "delays"
  | "part-closure"
  | "full-closure"
  | "unmapped-closure";

export type LineStatusLike = {
  statusSeverity?: number;
  statusSeverityDescription?: string;
  validityPeriods?: { fromDate?: string; toDate?: string; isNow?: boolean }[];
  disruption?: {
    closureText?: string;
    affectedRoutes?: AffectedRouteLike[];
    affectedStops?: StopLike[];
  };
};

export type AffectedRouteLike = {
  isEntireRouteSection?: boolean;
  name?: string;
  routeSectionNaptanEntrySequence?: {
    ordinal?: number;
    stopPoint?: StopLike;
  }[];
};

export type StopLike = {
  id?: string;
  naptanId?: string;
  stationNaptan?: string;
};

const FULL_CLOSURE_DESCRIPTIONS = new Set([
  "closed",
  "suspended",
  "planned closure",
  "no service",
  "not running",
  "service closed",
]);

const PART_CLOSURE_DESCRIPTIONS = new Set([
  "part closure",
  "part suspended",
  "part closed",
]);

const DELAY_DESCRIPTIONS = new Set([
  "minor delays",
  "severe delays",
  "reduced service",
  "diverted",
  "change of frequency",
  "issues reported",
]);

const FULL_CLOSURE_TEXTS = new Set([
  "plannedclosure",
  "fullclosure",
  "suspended",
  "closed",
  "noservice",
]);

const PART_CLOSURE_TEXTS = new Set(["partclosure", "partclosed", "partsuspended"]);

const DELAY_TEXTS = new Set([
  "minordelays",
  "severedelays",
  "reducedservice",
]);

const normalizeToken = (value: string): string =>
  value.toLowerCase().replace(/[\s_-]+/g, "");

/**
 * Classify structured status into a render kind.
 * Delays keep the official colour; closures may alter geometry.
 */
export const classifyLineStatus = (status: LineStatusLike): ServiceRenderKind => {
  const description = (status.statusSeverityDescription ?? "").trim().toLowerCase();
  const closureText = normalizeToken(status.disruption?.closureText ?? "");

  if (
    FULL_CLOSURE_DESCRIPTIONS.has(description) ||
    FULL_CLOSURE_TEXTS.has(closureText)
  ) {
    return "full-closure";
  }

  if (
    PART_CLOSURE_DESCRIPTIONS.has(description) ||
    PART_CLOSURE_TEXTS.has(closureText)
  ) {
    return "part-closure";
  }

  if (DELAY_DESCRIPTIONS.has(description) || DELAY_TEXTS.has(closureText)) {
    return "delays";
  }

  if (!description || description === "good service" || description === "no issues") {
    return "good";
  }

  // Bus Service / Special Service / Information — show label, don't invent geometry.
  const severity = status.statusSeverity ?? 10;
  if (severity <= 4) return "full-closure";
  if (severity === 5 || severity === 11) return "part-closure";
  if (severity === 6 || severity === 9 || severity === 7) return "delays";
  if (severity >= 10) return "good";

  return "delays";
};

/** Collect stop IDs that may appear on a diagram spine. */
export const stopIdentityIds = (stop: StopLike | null | undefined): string[] => {
  if (!stop) return [];
  const ids = [stop.stationNaptan, stop.naptanId, stop.id]
    .map((id) => id?.trim())
    .filter((id): id is string => Boolean(id));
  return [...new Set(ids)];
};

export const extractAffectedStopIds = (status: LineStatusLike): string[] => {
  const ids: string[] = [];

  for (const route of status.disruption?.affectedRoutes ?? []) {
    for (const entry of route.routeSectionNaptanEntrySequence ?? []) {
      ids.push(...stopIdentityIds(entry.stopPoint));
    }
  }

  for (const stop of status.disruption?.affectedStops ?? []) {
    ids.push(...stopIdentityIds(stop));
  }

  return [...new Set(ids)];
};

export type SpineMappingResult = {
  /** Adjacent pairs to mark out of use on the displayed spine */
  outOfUseRanges: { fromIndex: number; toIndex: number }[];
  /** True when structured data claimed a closure we could not place on the spine */
  unmappedClosure: boolean;
  /** Station IDs at closure endpoints (for forced labels) */
  closureEndpointIds: string[];
};

/**
 * Map affected stop IDs onto an ordered spine.
 * IDs that do not appear on the spine are ignored for geometry (branch absent
 * from this compact view). Prefer passing `topologyStationIds` when checking
 * whether a closure is “known” on any branch — see `closureMapsToTopology`.
 * If none map, `unmappedClosure` is true — keep colour, show a status note.
 */
export const mapAffectedIdsToSpine = (
  spineIds: readonly string[],
  affectedIds: readonly string[],
  options?: { treatAsEntireRoute?: boolean },
): SpineMappingResult => {
  if (options?.treatAsEntireRoute) {
    if (spineIds.length < 2) {
      return { outOfUseRanges: [], unmappedClosure: false, closureEndpointIds: [] };
    }
    return {
      outOfUseRanges: [{ fromIndex: 0, toIndex: spineIds.length - 1 }],
      unmappedClosure: false,
      closureEndpointIds: [spineIds[0]!, spineIds[spineIds.length - 1]!],
    };
  }

  if (affectedIds.length === 0) {
    return { outOfUseRanges: [], unmappedClosure: true, closureEndpointIds: [] };
  }

  const indexById = new Map<string, number>();
  spineIds.forEach((id, index) => indexById.set(id, index));

  const matchedIndexes = [
    ...new Set(
      affectedIds
        .map((id) => indexById.get(id))
        .filter((index): index is number => index != null),
    ),
  ].sort((a, b) => a - b);

  if (matchedIndexes.length === 0) {
    return { outOfUseRanges: [], unmappedClosure: true, closureEndpointIds: [] };
  }

  // Contiguous union covering all matched spine stops (part closure section).
  const fromIndex = matchedIndexes[0]!;
  const toIndex = matchedIndexes[matchedIndexes.length - 1]!;

  return {
    outOfUseRanges: fromIndex < toIndex ? [{ fromIndex, toIndex }] : [],
    unmappedClosure: false,
    closureEndpointIds:
      fromIndex < toIndex
        ? [spineIds[fromIndex]!, spineIds[toIndex]!]
        : [spineIds[fromIndex]!],
  };
};

/**
 * True when any affected stop id appears anywhere in the line topology
 * (including non-primary branches). Use before marking a closure unmapped.
 */
export const closureMapsToTopology = (
  topologyStationIdSet: ReadonlySet<string>,
  affectedIds: readonly string[],
): boolean => affectedIds.some((id) => topologyStationIdSet.has(id));

/** Merge half-open station-index ranges into diagram segment states. */
export const rangesToSegments = (
  spineIds: readonly string[],
  ranges: readonly { fromIndex: number; toIndex: number }[],
): DiagramSegment[] => {
  if (spineIds.length < 2) return [];

  const outOfUse = new Array(spineIds.length - 1).fill(false);
  for (const range of ranges) {
    for (let i = range.fromIndex; i < range.toIndex; i += 1) {
      if (i >= 0 && i < outOfUse.length) outOfUse[i] = true;
    }
  }

  return outOfUse.map((isOut, i) => ({
    fromStationId: spineIds[i]!,
    toStationId: spineIds[i + 1]!,
    state: isOut ? ("out-of-use" as const) : ("normal" as const),
  }));
};

/**
 * Station IDs to grey for closed segment ranges.
 * Uses the all-adjacent-closed rule (far terminals of a part closure grey;
 * boundary stations that still have an open side stay coloured).
 */
export const rangesToStationOutOfUseIds = (
  spineIds: readonly string[],
  ranges: readonly { fromIndex: number; toIndex: number }[],
): string[] => {
  if (spineIds.length === 0 || ranges.length === 0) return [];

  const segments = rangesToSegments(spineIds, ranges);
  const segmentStates = segments.map((segment) => segment.state);
  const flags = stationOutOfUseFlags(spineIds.length, segmentStates);
  return spineIds.filter((_, index) => flags[index]);
};

/** Pure station flags from segment states (shared with diagram helpers). */
const stationOutOfUseFlags = (
  stationCount: number,
  segmentStates: readonly ("normal" | "out-of-use")[],
): boolean[] => {
  const out = new Array(stationCount).fill(false);
  if (stationCount === 0) return out;

  for (let i = 0; i < stationCount; i += 1) {
    const hasLeft = i > 0;
    const hasRight = i < segmentStates.length;
    if (!hasLeft && !hasRight) continue;

    const leftClosed = hasLeft && segmentStates[i - 1] === "out-of-use";
    const rightClosed = hasRight && segmentStates[i] === "out-of-use";

    if (hasLeft && hasRight) {
      out[i] = leftClosed && rightClosed;
    } else if (hasLeft) {
      out[i] = leftClosed;
    } else {
      out[i] = rightClosed;
    }
  }

  return out;
};

export type DayLineServiceState = {
  kind: ServiceRenderKind;
  /** Status labels to show (structured descriptions only) */
  labels: string[];
  segments: DiagramSegment[];
  forceLabelIds: string[];
  /** Stations whose markers should use the out-of-use colour */
  stationOutOfUseIds: string[];
  /** Concise note when a closure could not be mapped onto the spine */
  note?: string;
};

const emptyGoodState = (spineIds: readonly string[]): DayLineServiceState => ({
  kind: "good",
  labels: [],
  segments: rangesToSegments(spineIds, []),
  forceLabelIds: [],
  stationOutOfUseIds: [],
});

const statusesForDay = (
  statuses: LineStatusLike[],
  dayStartMs: number,
  dayEndMs: number,
): LineStatusLike[] => {
  const overlapping = statuses.filter((status) => {
    const periods = status.validityPeriods ?? [];
    if (periods.length === 0) {
      // Realtime "Good Service" rows often omit periods — treat as current-only.
      // For a future day, empty periods do not apply.
      return false;
    }
    return periods.some((period) =>
      validityOverlapsDay(period, dayStartMs, dayEndMs),
    );
  });
  return overlapping;
};

/**
 * Build render state for one line on one selected day from pre-fetched statuses.
 */
export const buildDayLineServiceState = (
  spineIds: readonly string[],
  statuses: LineStatusLike[] | null | undefined,
  dayStartMs: number,
  dayEndMs: number,
): DayLineServiceState => {
  if (!statuses?.length) {
    return emptyGoodState(spineIds);
  }

  const active = statusesForDay(statuses, dayStartMs, dayEndMs);
  if (active.length === 0) {
    return emptyGoodState(spineIds);
  }

  const labels = [
    ...new Set(
      active
        .map((s) => s.statusSeverityDescription?.trim())
        .filter(
          (label): label is string =>
            typeof label === "string" &&
            label.length > 0 &&
            label.toLowerCase() !== "good service",
        ),
    ),
  ];

  const kinds = active.map(classifyLineStatus);
  const hasFull = kinds.includes("full-closure");
  const hasPart = kinds.includes("part-closure");
  const hasDelays = kinds.includes("delays");

  if (hasFull) {
    const mapping = mapAffectedIdsToSpine(spineIds, [], { treatAsEntireRoute: true });
    return {
      kind: "full-closure",
      labels,
      segments: rangesToSegments(spineIds, mapping.outOfUseRanges),
      forceLabelIds: mapping.closureEndpointIds,
      stationOutOfUseIds: rangesToStationOutOfUseIds(
        spineIds,
        mapping.outOfUseRanges,
      ),
    };
  }

  if (hasPart) {
    const ranges: { fromIndex: number; toIndex: number }[] = [];
    const forceLabelIds: string[] = [];
    let unmapped = false;

    for (const status of active) {
      if (classifyLineStatus(status) !== "part-closure") continue;

      const entire = status.disruption?.affectedRoutes?.some(
        (route) => route.isEntireRouteSection,
      );
      if (entire) {
        const mapping = mapAffectedIdsToSpine(spineIds, [], { treatAsEntireRoute: true });
        ranges.push(...mapping.outOfUseRanges);
        forceLabelIds.push(...mapping.closureEndpointIds);
        continue;
      }

      const affectedIds = extractAffectedStopIds(status);
      const mapping = mapAffectedIdsToSpine(spineIds, affectedIds);
      if (mapping.unmappedClosure) unmapped = true;
      ranges.push(...mapping.outOfUseRanges);
      forceLabelIds.push(...mapping.closureEndpointIds);
    }

    if (ranges.length === 0 && unmapped) {
      return {
        kind: "unmapped-closure",
        labels,
        segments: rangesToSegments(spineIds, []),
        forceLabelIds: [],
        stationOutOfUseIds: [],
        note: "Closure not on displayed route",
      };
    }

    return {
      kind: ranges.length > 0 ? "part-closure" : hasDelays ? "delays" : "good",
      labels,
      segments: rangesToSegments(spineIds, ranges),
      forceLabelIds: [...new Set(forceLabelIds)],
      stationOutOfUseIds: rangesToStationOutOfUseIds(spineIds, ranges),
      note: unmapped ? "Some closures not on displayed route" : undefined,
    };
  }

  if (hasDelays || labels.length > 0) {
    return {
      kind: hasDelays ? "delays" : "good",
      labels,
      segments: rangesToSegments(spineIds, []),
      forceLabelIds: [],
      stationOutOfUseIds: [],
    };
  }

  return emptyGoodState(spineIds);
};
