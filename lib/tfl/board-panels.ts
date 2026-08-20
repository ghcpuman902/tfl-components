/**
 * Hosted Board panel kinds and slot stacks. Pure: no React / browser APIs.
 * Slots say what goes where; domain ids stay on a.* / b.* / r.* / c.* / s.*.
 */

export const BOARD_PANEL_KINDS = [
  "rail",
  "bus",
  "river",
  "cycle",
  "status",
] as const;

export type BoardPanelKind = (typeof BOARD_PANEL_KINDS)[number];

const PANEL_KIND_SET = new Set<string>(BOARD_PANEL_KINDS);

export const DEFAULT_BOARD_SLOT_P1: readonly BoardPanelKind[] = ["rail"];
export const DEFAULT_BOARD_SLOT_P2: readonly BoardPanelKind[] = ["status"];

export type BoardResolvedSlots = {
  p1: readonly BoardPanelKind[];
  p2: readonly BoardPanelKind[];
};

export const parsePanelKind = (raw: string): BoardPanelKind | undefined => {
  const trimmed = raw.trim().toLowerCase();
  return PANEL_KIND_SET.has(trimmed)
    ? (trimmed as BoardPanelKind)
    : undefined;
};

/** First-wins, drop unknown. Empty / all-invalid → undefined. */
export const parseBoardPanels = (
  raw: string | null,
): readonly BoardPanelKind[] | undefined => {
  if (raw === null) return undefined;
  const seen = new Set<BoardPanelKind>();
  const ordered: BoardPanelKind[] = [];
  for (const part of raw.split(",")) {
    const kind = parsePanelKind(part);
    if (!kind || seen.has(kind)) continue;
    seen.add(kind);
    ordered.push(kind);
  }
  return ordered.length > 0 ? ordered : undefined;
};

export const serializeBoardPanels = (
  value: readonly BoardPanelKind[] | undefined,
): string | undefined => {
  if (!value?.length) return undefined;
  const seen = new Set<BoardPanelKind>();
  const ordered: BoardPanelKind[] = [];
  for (const raw of value) {
    const kind = parsePanelKind(raw);
    if (!kind || seen.has(kind)) continue;
    seen.add(kind);
    ordered.push(kind);
  }
  return ordered.length > 0 ? ordered.join(",") : undefined;
};

const samePanelList = (
  left: readonly BoardPanelKind[],
  right: readonly BoardPanelKind[],
): boolean =>
  left.length === right.length &&
  left.every((kind, index) => kind === right[index]);

/** True when both slots match the omitted default (rail + status). */
export const isDefaultBoardSlots = (
  p1: readonly BoardPanelKind[] | undefined,
  p2: readonly BoardPanelKind[] | undefined,
): boolean => {
  if (p1 === undefined && p2 === undefined) return true;
  const left = p1 ?? [];
  const right = p2 ?? [];
  return (
    samePanelList(left, DEFAULT_BOARD_SLOT_P1) &&
    samePanelList(right, DEFAULT_BOARD_SLOT_P2)
  );
};

/**
 * Resolve stacks for display. Both params omitted → today's station board.
 * `p1` set and `p2` omitted → single column.
 */
export const resolveBoardSlots = (
  p1: readonly BoardPanelKind[] | undefined,
  p2: readonly BoardPanelKind[] | undefined,
): BoardResolvedSlots => {
  if (p1 === undefined && p2 === undefined) {
    return { p1: DEFAULT_BOARD_SLOT_P1, p2: DEFAULT_BOARD_SLOT_P2 };
  }
  return { p1: p1 ?? [], p2: p2 ?? [] };
};

export const boardSlotsInclude = (
  slots: BoardResolvedSlots,
  kind: BoardPanelKind,
): boolean => slots.p1.includes(kind) || slots.p2.includes(kind);

/** Bus / river route ids: `73`, `n8`, `el1`. */
export const parseRouteIdItem = (raw: string): string | undefined => {
  const id = raw.trim().toLowerCase();
  if (!id || id.length > 8) return undefined;
  if (!/^[a-z]{0,3}\d{1,3}[a-z]?$/.test(id)) return undefined;
  return id;
};

export const parseRouteIdList = (
  raw: string | null,
): readonly string[] | undefined => {
  if (raw === null) return undefined;
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const part of raw.split(",")) {
    const id = parseRouteIdItem(part);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  return ordered.length > 0 ? ordered : undefined;
};

export const serializeRouteIdList = (
  value: readonly string[] | undefined,
): string | undefined => {
  if (!value?.length) return undefined;
  const parsed = parseRouteIdList(value.join(","));
  return parsed?.join(",");
};

export const formatBikePointId = (id: string): string => {
  const trimmed = id.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("BikePoints_") ? trimmed : `BikePoints_${trimmed}`;
};

export const parseDockIdItem = (raw: string): string | undefined => {
  const formatted = formatBikePointId(raw);
  if (!formatted) return undefined;
  const suffix = formatted.slice("BikePoints_".length);
  if (!/^\d+$/.test(suffix)) return undefined;
  return formatted;
};

export const parseDockIdList = (
  raw: string | null,
): readonly string[] | undefined => {
  if (raw === null) return undefined;
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const part of raw.split(",")) {
    const id = parseDockIdItem(part);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  return ordered.length > 0 ? ordered : undefined;
};

export const serializeDockIdList = (
  value: readonly string[] | undefined,
): string | undefined => {
  if (!value?.length) return undefined;
  const parsed = parseDockIdList(value.join(","));
  return parsed?.join(",");
};
