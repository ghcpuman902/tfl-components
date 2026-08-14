/**
 * Resolve Board URL arrivals settings into stable ID-keyed component props.
 * Pure: no React / browser APIs. Compact positional URL values are zipped
 * against effective line order here — the installable component never sees
 * a fragile positional array.
 */

import { normalizeLineId } from "tfl-ts";
import { RAIL_ARRIVALS_DEFAULT_PAGE_SIZE } from "@/lib/tfl/arrivals-defaults";
import type { RailArrivalsLine } from "@/lib/tfl/arrivals-prepare";
import { compareArrivalsLines } from "@/lib/tfl/arrivals-line-sort";
import type { BoardConfig } from "@/lib/tfl/board-url-state";

export type ResolvedArrivalsProps = {
  /** Seeded serving lines (with bounds when known). */
  lines?: readonly RailArrivalsLine[];
  /** Explicit order for the component (`lineOrder` prop). */
  lineOrder?: readonly string[];
  /** Scalar broadcast page size. */
  pageSize?: number;
  /** ID-keyed rows-per-bound override from positional `a.rows`. */
  pageSizeByLine?: Readonly<Record<string, number>>;
};

/**
 * Effective order for positional zip:
 * 1. Explicit `a.lines` (already normalized), then unlisted serving lines
 *    canonical among themselves.
 * 2. Else offline serving lines (already canonical).
 * 3. Else `dataLineIds` sorted canonically (live-data fallback).
 */
export const resolveEffectiveLineOrder = (
  config: BoardConfig,
  servingLines: readonly RailArrivalsLine[] | undefined,
  dataLineIds: readonly string[] = [],
): string[] => {
  const servingIds = [...(servingLines ?? [])]
    .map((line) => ({
      lineId: normalizeLineId(line.lineId),
      lineName: line.lineName,
    }))
    .sort(compareArrivalsLines)
    .map((line) => line.lineId);
  const servingSet = new Set(servingIds);

  const dataIds = [
    ...new Set(
      dataLineIds
        .map((id) => normalizeLineId(id))
        .filter(Boolean),
    ),
  ];

  const membership =
    servingIds.length > 0
      ? servingIds
      : [...dataIds].sort((a, b) =>
          compareArrivalsLines(
            { lineId: a, lineName: a },
            { lineId: b, lineName: b },
          ),
        );

  const explicit = config.arrivals.lineOrder;
  if (!explicit?.length) return membership;

  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const raw of explicit) {
    const id = normalizeLineId(raw);
    if (!id || seen.has(id)) continue;
    // Only include lines that serve (offline) or appear in live data.
    // Never seed a phantom section from a.lines alone.
    const inMembership = servingSet.has(id) || dataIds.includes(id);
    // When we have offline membership, honor listed serving lines.
    // When we only have data, honor listed data lines.
    // Listed non-serving / non-data lines are skipped (not seeded).
    if (servingIds.length > 0) {
      if (!servingSet.has(id)) continue;
    } else if (!inMembership) {
      continue;
    }
    seen.add(id);
    ordered.push(id);
  }

  const remainder = membership.filter((id) => !seen.has(id));
  return [...ordered, ...remainder];
};

const zipPageSizes = (
  rows: readonly (number | undefined)[],
  lineIds: readonly string[],
): Record<string, number> => {
  const map: Record<string, number> = {};
  for (let i = 0; i < lineIds.length; i++) {
    const lineId = lineIds[i];
    if (!lineId) continue;
    const value = rows[i];
    if (value === undefined) continue;
    map[lineId] = value;
  }
  return map;
};

/**
 * Map Board config + serving-line metadata → RailArrivalsBoard props.
 * `dataLineIds` is used only when offline membership is unknown.
 */
export const resolveArrivalsProps = (
  config: BoardConfig,
  servingLines: readonly RailArrivalsLine[] | undefined,
  dataLineIds: readonly string[] = [],
): ResolvedArrivalsProps => {
  const effectiveOrder = resolveEffectiveLineOrder(
    config,
    servingLines,
    dataLineIds,
  );

  const result: ResolvedArrivalsProps = {};

  if (servingLines?.length) {
    result.lines = servingLines;
  }

  if (config.arrivals.lineOrder?.length) {
    result.lineOrder = config.arrivals.lineOrder;
  }

  const rows = config.arrivals.rows;
  if (rows === undefined) {
    return result;
  }

  if (typeof rows === "number") {
    if (rows !== RAIL_ARRIVALS_DEFAULT_PAGE_SIZE) {
      result.pageSize = rows;
    }
    return result;
  }

  // Positional list → ID-keyed map. Unknown/empty slots skip (component default).
  // Extra values beyond effectiveOrder are ignored; short lists leave a gap.
  // Drop unknown line IDs already happened at parse for a.lines; for zip we
  // only map onto effectiveOrder.
  const pageSizeByLine = zipPageSizes(rows, effectiveOrder);
  if (Object.keys(pageSizeByLine).length > 0) {
    result.pageSizeByLine = pageSizeByLine;
  }

  return result;
};
