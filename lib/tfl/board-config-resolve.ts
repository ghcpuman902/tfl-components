/**
 * Resolve Board URL arrivals settings into stable ID-keyed component props.
 * Pure: no React / browser APIs. Compact positional URL values are zipped
 * against effective *sections* here — merged shared-platform lines share one
 * slot, matching the arrivals board. The installable component never sees
 * a fragile positional array.
 */

import { normalizeLineId } from "tfl-ts";
import { RAIL_ARRIVALS_DEFAULT_PAGE_SIZE } from "@/lib/tfl/arrivals-defaults";
import type { RailArrivalsLine } from "@/lib/tfl/arrivals-prepare";
import { compareArrivalsLines } from "@/lib/tfl/arrivals-line-sort";
import type { BoardStationLineGroup } from "@/lib/tfl/board-station-lines";
import type { BoardConfig } from "@/lib/tfl/board-url-state";
import { getLineNameTiers, joinLineNames } from "@/lib/tfl/line-names";

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

/** One board section — a single line, or a shared-platform merge. */
export type BoardArrivalsSection = {
  /** Canonical-first member; used in `a.lines` placeholders. */
  lineId: string;
  /** Every member id. Length 1 when unmerged. */
  lineIds: readonly string[];
  /** Board heading for this section (TfL list grammar when merged). */
  lineName: string;
  /** Rows per bound when the URL does not override. */
  defaultPageSize: number;
};

type ResolvedMerge = {
  lines: readonly string[];
  label?: string;
  pageSize?: number;
};

const lineDisplayName = (
  lineId: string,
  servingLines: readonly RailArrivalsLine[] | undefined,
): string => {
  const fromServing = servingLines?.find((line) => line.lineId === lineId);
  if (fromServing?.lineName) return fromServing.lineName;
  return getLineNameTiers(lineId).full;
};

const resolveMergeMembership = (
  lineGroups: readonly BoardStationLineGroup[] | undefined,
): Map<string, ResolvedMerge> => {
  const membership = new Map<string, ResolvedMerge>();
  for (const raw of lineGroups ?? []) {
    const lines = [
      ...new Set(raw.lines.map((id) => normalizeLineId(id)).filter(Boolean)),
    ];
    if (lines.length < 2) continue;
    if (lines.some((id) => membership.has(id))) continue;
    const entry: ResolvedMerge = {
      lines,
      label: raw.label,
      pageSize: raw.pageSize,
    };
    for (const id of lines) membership.set(id, entry);
  }
  return membership;
};

const sectionFromMerge = (
  merge: ResolvedMerge,
  servingLines: readonly RailArrivalsLine[] | undefined,
): BoardArrivalsSection => {
  const names = merge.lines.map((id) => lineDisplayName(id, servingLines));
  return {
    lineId: merge.lines[0] ?? "",
    lineIds: merge.lines,
    lineName: merge.label?.trim() || joinLineNames(names),
    defaultPageSize: merge.pageSize ?? RAIL_ARRIVALS_DEFAULT_PAGE_SIZE,
  };
};

/**
 * Flat serving / data order before shared-platform collapse.
 * 1. Explicit `a.lines` (already normalized), then unlisted serving lines
 *    canonical among themselves.
 * 2. Else offline serving lines (already canonical).
 * 3. Else `dataLineIds` sorted canonically (live-data fallback).
 */
const resolveFlatLineOrder = (
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
    const inMembership = servingSet.has(id) || dataIds.includes(id);
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

const collapseToSections = (
  flatOrder: readonly string[],
  servingLines: readonly RailArrivalsLine[] | undefined,
  lineGroups: readonly BoardStationLineGroup[] | undefined,
): BoardArrivalsSection[] => {
  const merges = resolveMergeMembership(lineGroups);
  const seen = new Set<string>();
  const sections: BoardArrivalsSection[] = [];

  for (const lineId of flatOrder) {
    if (!lineId || seen.has(lineId)) continue;
    const merge = merges.get(lineId);
    if (merge) {
      for (const id of merge.lines) seen.add(id);
      sections.push(sectionFromMerge(merge, servingLines));
      continue;
    }
    seen.add(lineId);
    sections.push({
      lineId,
      lineIds: [lineId],
      lineName: lineDisplayName(lineId, servingLines),
      defaultPageSize: RAIL_ARRIVALS_DEFAULT_PAGE_SIZE,
    });
  }

  return sections;
};

/**
 * Board sections for this stop — shared-platform merges collapse to one slot.
 */
export const resolveEffectiveSections = (
  config: BoardConfig,
  servingLines: readonly RailArrivalsLine[] | undefined,
  dataLineIds: readonly string[] = [],
  lineGroups?: readonly BoardStationLineGroup[],
): BoardArrivalsSection[] =>
  collapseToSections(
    resolveFlatLineOrder(config, servingLines, dataLineIds),
    servingLines,
    lineGroups,
  );

/**
 * Representative line ids in section order (merged lines → canonical-first id).
 */
export const resolveEffectiveLineOrder = (
  config: BoardConfig,
  servingLines: readonly RailArrivalsLine[] | undefined,
  dataLineIds: readonly string[] = [],
  lineGroups?: readonly BoardStationLineGroup[],
): string[] =>
  resolveEffectiveSections(
    config,
    servingLines,
    dataLineIds,
    lineGroups,
  ).map((section) => section.lineId);

const zipPageSizesBySection = (
  rows: readonly (number | undefined)[],
  sections: readonly BoardArrivalsSection[],
): Record<string, number> => {
  const map: Record<string, number> = {};
  for (let i = 0; i < sections.length; i++) {
    const value = rows[i];
    if (value === undefined) continue;
    for (const lineId of sections[i]?.lineIds ?? []) {
      map[lineId] = value;
    }
  }
  return map;
};

/** A lone number (no comma) broadcasts to every section, including merges. */
const resolveBroadcastRows = (
  rows: BoardConfig["arrivals"]["rows"],
): number | undefined => (typeof rows === "number" ? rows : undefined);

/**
 * Live “Central: max 3, Circle, Hammersmith & City and Metropolitan: max 6”
 * preview. Empty uses section defaults (3, or 2×3 when merged). A scalar
 * broadcasts. A comma list zips by section; empty slots keep the default.
 */
export const formatArrivalsRowsPreview = (
  config: BoardConfig,
  servingLines: readonly RailArrivalsLine[] | undefined,
  lineGroups?: readonly BoardStationLineGroup[],
): string | null => {
  const sections = resolveEffectiveSections(
    config,
    servingLines,
    [],
    lineGroups,
  );
  if (sections.length === 0) return null;

  const rows = config.arrivals.rows;
  const broadcast = resolveBroadcastRows(rows);

  return sections
    .map((section, index) => {
      let max = section.defaultPageSize;
      if (broadcast !== undefined) {
        max = broadcast;
      } else if (Array.isArray(rows) && rows[index] !== undefined) {
        max = rows[index] as number;
      }
      return `${section.lineName}: max ${max}`;
    })
    .join(", ");
};

/** Placeholder for `a.rows` — scalar 3, or a list when sections differ. */
export const formatArrivalsRowsPlaceholder = (
  sections: readonly BoardArrivalsSection[],
): string => {
  if (
    sections.some(
      (section) => section.defaultPageSize !== RAIL_ARRIVALS_DEFAULT_PAGE_SIZE,
    )
  ) {
    return sections.map((section) => String(section.defaultPageSize)).join(",");
  }
  return String(RAIL_ARRIVALS_DEFAULT_PAGE_SIZE);
};

/**
 * Map Board config + serving-line metadata → RailArrivalsBoard props.
 * `dataLineIds` is used only when offline membership is unknown.
 * `lineGroups` collapses shared-platform lines so positional `a.rows`
 * zips one slot per board section.
 */
export const resolveArrivalsProps = (
  config: BoardConfig,
  servingLines: readonly RailArrivalsLine[] | undefined,
  dataLineIds: readonly string[] = [],
  lineGroups?: readonly BoardStationLineGroup[],
): ResolvedArrivalsProps => {
  const sections = resolveEffectiveSections(
    config,
    servingLines,
    dataLineIds,
    lineGroups,
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
    const broadcast = resolveBroadcastRows(rows);
    if (broadcast !== undefined) {
      result.pageSize = broadcast;
    }
    return result;
  }

  const pageSizeByLine = zipPageSizesBySection(rows, sections);
  if (Object.keys(pageSizeByLine).length > 0) {
    result.pageSizeByLine = pageSizeByLine;
  }

  return result;
};
