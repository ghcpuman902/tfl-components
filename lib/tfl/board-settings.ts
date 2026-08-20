/**
 * Typed Board setting definitions — source of truth for defaults, codecs,
 * URL allowlisting, and form exposure. Pure: no React / browser APIs.
 *
 * Only settings declared here exist for the URL or the Config form.
 * Component props like `data`, `error`, `loading`, `children`, callbacks,
 * `className`, and `classNames` are never auto-derived.
 */

import { LINE_ORDER, normalizeLineId } from "tfl-ts";
import { RAIL_ARRIVALS_DEFAULT_PAGE_SIZE } from "@/lib/tfl/arrivals-defaults";
import { CYCLE_HIRE_DISPLAY_DEFAULT_TILES } from "@/lib/tfl/cycle-hire-display";
import {
  parseDockIdItem,
  parsePanelKind,
  parseRouteIdItem,
  type BoardPanelKind,
} from "@/lib/tfl/board-panels";

export type { BoardPanelKind };

export type BoardScope =
  | "shell"
  | "arrivals"
  | "status"
  | "bus"
  | "river"
  | "cycle";

export type BoardBehaviour = "interactive" | "unattended";
export type BoardStatusSurface = "display" | "strip";
export type BoardStatusOverview = "network" | "selection" | "none";

export type BoardSettingUi = {
  label: string;
  help?: string;
  control: "select" | "number" | "text";
  options?: readonly { value: string; label: string }[];
};

type SettingBase<T> = {
  param: string;
  scope: BoardScope;
  defaultValue: T;
  isDefault: (value: T) => boolean;
  /** Parsed / serialized in the hash fragment. */
  url: boolean;
  /** Exposed by the Board Config form. */
  form: boolean;
  ui?: BoardSettingUi;
};

export type ScalarSetting<T> = SettingBase<T> & {
  kind: "scalar";
  /** `undefined` → use `defaultValue`. */
  parse: (raw: string) => T | undefined;
  serialize: (value: T) => string;
};

export type ListSetting<T> = SettingBase<T> & {
  kind: "list";
  parseItem: (raw: string) => T extends readonly (infer U)[] ? U | undefined : never;
  serializeItem: (value: T extends readonly (infer U)[] ? U : never) => string;
};

export type BoardSetting<T = unknown> = ScalarSetting<T> | ListSetting<T>;

const BEHAVIOURS = new Set<BoardBehaviour>(["interactive", "unattended"]);
const STATUS_SURFACES = new Set<BoardStatusSurface>(["display", "strip"]);
const STATUS_OVERVIEWS = new Set<BoardStatusOverview>([
  "network",
  "selection",
  "none",
]);
const LINE_ORDER_SET = new Set<string>(LINE_ORDER);
const LEGACY_MODE_TO_BEHAVIOUR: Record<string, BoardBehaviour> = {
  static: "interactive",
  mouse: "interactive",
  touch: "interactive",
};

/** Max rows visible per bound (matches `maxRows` default on the arrivals board). */
export const BOARD_ROWS_MAX = 16;

export const parseOptionalString = (raw: string): string | undefined => {
  const trimmed = raw.trim();
  return trimmed ? trimmed : undefined;
};

export const parseBehaviour = (raw: string): BoardBehaviour | undefined => {
  const trimmed = raw.trim();
  if (BEHAVIOURS.has(trimmed as BoardBehaviour)) {
    return trimmed as BoardBehaviour;
  }
  return LEGACY_MODE_TO_BEHAVIOUR[trimmed];
};

export const parseStatusSurface = (
  raw: string,
): BoardStatusSurface | undefined => {
  const trimmed = raw.trim();
  return STATUS_SURFACES.has(trimmed as BoardStatusSurface)
    ? (trimmed as BoardStatusSurface)
    : undefined;
};

export const parseStatusOverview = (
  raw: string,
): BoardStatusOverview | undefined => {
  const trimmed = raw.trim();
  return STATUS_OVERVIEWS.has(trimmed as BoardStatusOverview)
    ? (trimmed as BoardStatusOverview)
    : undefined;
};

export const parseBooleanFlag = (raw: string): boolean | undefined => {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "true" || trimmed === "1") return true;
  if (trimmed === "false" || trimmed === "0") return false;
  return undefined;
};

export const parseDwellSeconds = (raw: string): number | undefined => {
  const trimmed = raw.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return undefined;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1) return undefined;
  return Math.min(n, 120);
};

/**
 * Parse one `a.rows` item. Valid: integer 0–16 (0 = show all, no pager).
 * Values above 16 clamp to 16. Negative / decimal / non-numeric → undefined
 * (caller substitutes the component default).
 */
export const parseRowsItem = (raw: string): number | undefined => {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (!/^\d+$/.test(trimmed)) return undefined;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 0) return undefined;
  return Math.min(n, BOARD_ROWS_MAX);
};

export const serializeRowsItem = (value: number): string => String(value);

/**
 * Normalize a line id; drop unknowns not in `LINE_ORDER`.
 * Returns undefined for empty / unknown.
 */
export const parseLineIdItem = (raw: string): string | undefined => {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return undefined;
  const id = normalizeLineId(trimmed);
  return LINE_ORDER_SET.has(id) ? id : undefined;
};

export const serializeLineIdItem = (value: string): string => value;

/** Split a comma list; accepts literal commas and `%2C`-decoded forms. */
export const splitCommaList = (raw: string): string[] =>
  raw.split(",").map((part) => part.trim());

export const BOARD_SETTINGS = {
  stop: {
    kind: "scalar",
    param: "stop",
    scope: "shell",
    defaultValue: undefined as string | undefined,
    parse: parseOptionalString,
    serialize: (value: string | undefined) => value ?? "",
    isDefault: (value: string | undefined) => !value,
    url: true,
    form: true,
    ui: {
      label: "Stop ID",
      help: "Station NaPTAN ID. Find it in Explorer.",
      control: "text",
    },
  } satisfies ScalarSetting<string | undefined>,

  stopName: {
    kind: "scalar",
    param: "stopName",
    scope: "shell",
    defaultValue: undefined as string | undefined,
    parse: parseOptionalString,
    serialize: (value: string | undefined) => value ?? "",
    isDefault: (value: string | undefined) => !value,
    url: true,
    form: true,
    ui: {
      label: "Stop name (optional)",
      help: "Override the heading. Leave blank to use the station name from the Stop ID.",
      control: "text",
    },
  } satisfies ScalarSetting<string | undefined>,

  behaviour: {
    kind: "scalar",
    param: "behaviour",
    scope: "shell",
    defaultValue: "interactive" as BoardBehaviour,
    parse: parseBehaviour,
    serialize: (value: BoardBehaviour) => value,
    isDefault: (value: BoardBehaviour) => value === "interactive",
    url: true,
    form: true,
    ui: {
      label: "Behaviour",
      help: "Interactive waits for swipe, click, or keyboard. Unattended advances pageable panels on a timer.",
      control: "select",
      options: [
        { value: "interactive", label: "Interactive" },
        { value: "unattended", label: "Unattended" },
      ],
    },
  } satisfies ScalarSetting<BoardBehaviour>,

  arrivalsRows: {
    kind: "scalar",
    param: "a.rows",
    scope: "arrivals",
    defaultValue: RAIL_ARRIVALS_DEFAULT_PAGE_SIZE,
    parse: (raw: string) => {
      const parts = splitCommaList(raw);
      if (parts.length === 0) return undefined;
      if (parts.length === 1) {
        return parseRowsItem(parts[0] ?? "");
      }
      // List form is handled specially in board-url-state (returns an array).
      // Scalar parse of a multi-item string is unused — see parseArrivalsRows.
      return undefined;
    },
    serialize: (value: number) => serializeRowsItem(value),
    isDefault: () => false,
    url: true,
    form: true,
    ui: {
      label: "Rows per line",
      help: "One number applies to every section. A comma list matches line order; empty slots use the section default (3, or 6 when lines share platforms). 0 shows every row.",
      control: "text",
    },
  } satisfies ScalarSetting<number>,

  /**
   * Visible rail lines, in this order. Listed lines are the only sections
   * shown. Blank uses every serving line in canonical order.
   */
  arrivalsLines: {
    kind: "list",
    param: "a.lines",
    scope: "arrivals",
    defaultValue: [] as readonly string[],
    parseItem: parseLineIdItem,
    serializeItem: serializeLineIdItem,
    isDefault: (value: readonly string[]) => value.length === 0,
    url: true,
    form: true,
    ui: {
      label: "Lines (optional)",
      help: "Comma-separated line ids to show, in this order. Leave blank for every line at the station.",
      control: "text",
    },
  } satisfies ListSetting<readonly string[]>,

  slot1: {
    kind: "list",
    param: "p1",
    scope: "shell",
    defaultValue: ["rail"] as readonly BoardPanelKind[],
    parseItem: parsePanelKind,
    serializeItem: (value: BoardPanelKind) => value,
    isDefault: (value: readonly BoardPanelKind[]) =>
      value.length === 1 && value[0] === "rail",
    url: true,
    form: true,
    ui: {
      label: "Wide slot",
      help: "Comma stack: rail, bus, river, cycle, status. First on small screens.",
      control: "text",
    },
  } satisfies ListSetting<readonly BoardPanelKind[]>,

  slot2: {
    kind: "list",
    param: "p2",
    scope: "shell",
    defaultValue: ["status"] as readonly BoardPanelKind[],
    parseItem: parsePanelKind,
    serializeItem: (value: BoardPanelKind) => value,
    isDefault: (value: readonly BoardPanelKind[]) =>
      value.length === 1 && value[0] === "status",
    url: true,
    form: true,
    ui: {
      label: "Narrow slot",
      help: "Leave empty for a one-panel board.",
      control: "text",
    },
  } satisfies ListSetting<readonly BoardPanelKind[]>,

  busStop: {
    kind: "scalar",
    param: "b.stop",
    scope: "bus",
    defaultValue: undefined as string | undefined,
    parse: parseOptionalString,
    serialize: (value: string | undefined) => value ?? "",
    isDefault: (value: string | undefined) => !value,
    url: true,
    form: true,
    ui: {
      label: "Bus stop ID",
      help: "Boardable bus StopPoint (usually 490…). Search or locate on this page.",
      control: "text",
    },
  } satisfies ScalarSetting<string | undefined>,

  busRoutes: {
    kind: "list",
    param: "b.routes",
    scope: "bus",
    defaultValue: [] as readonly string[],
    parseItem: parseRouteIdItem,
    serializeItem: (value: string) => value,
    isDefault: (value: readonly string[]) => value.length === 0,
    url: true,
    form: true,
    ui: {
      label: "Bus routes (optional)",
      help: "Comma-separated route ids. Leave blank for every route at the stop.",
      control: "text",
    },
  } satisfies ListSetting<readonly string[]>,

  busRows: {
    kind: "scalar",
    param: "b.rows",
    scope: "bus",
    defaultValue: RAIL_ARRIVALS_DEFAULT_PAGE_SIZE,
    parse: parseRowsItem,
    serialize: serializeRowsItem,
    isDefault: (value: number) => value === RAIL_ARRIVALS_DEFAULT_PAGE_SIZE,
    url: true,
    form: true,
    ui: {
      label: "Bus rows",
      help: "Visible arrivals per page. 0 shows every row.",
      control: "number",
    },
  } satisfies ScalarSetting<number>,

  riverStop: {
    kind: "scalar",
    param: "r.stop",
    scope: "river",
    defaultValue: undefined as string | undefined,
    parse: parseOptionalString,
    serialize: (value: string | undefined) => value ?? "",
    isDefault: (value: string | undefined) => !value,
    url: true,
    form: true,
    ui: {
      label: "Pier ID",
      help: "River pier (930G…). Poll the pier, not a berth.",
      control: "text",
    },
  } satisfies ScalarSetting<string | undefined>,

  riverRows: {
    kind: "scalar",
    param: "r.rows",
    scope: "river",
    defaultValue: RAIL_ARRIVALS_DEFAULT_PAGE_SIZE,
    parse: parseRowsItem,
    serialize: serializeRowsItem,
    isDefault: (value: number) => value === RAIL_ARRIVALS_DEFAULT_PAGE_SIZE,
    url: true,
    form: true,
    ui: {
      label: "River rows",
      help: "Visible arrivals per page. 0 shows every row.",
      control: "number",
    },
  } satisfies ScalarSetting<number>,

  cycleDocks: {
    kind: "list",
    param: "c.docks",
    scope: "cycle",
    defaultValue: [] as readonly string[],
    parseItem: parseDockIdItem,
    serializeItem: (value: string) => value,
    isDefault: (value: readonly string[]) => value.length === 0,
    url: true,
    form: true,
    ui: {
      label: "Cycle docks",
      help: "Comma-separated BikePoint ids.",
      control: "text",
    },
  } satisfies ListSetting<readonly string[]>,

  cycleTiles: {
    kind: "scalar",
    param: "c.tiles",
    scope: "cycle",
    defaultValue: CYCLE_HIRE_DISPLAY_DEFAULT_TILES,
    parse: parseRowsItem,
    serialize: serializeRowsItem,
    isDefault: (value: number) => value === CYCLE_HIRE_DISPLAY_DEFAULT_TILES,
    url: true,
    form: true,
    ui: {
      label: "Cycle tiles",
      help: "Fixed height in arrivals-row tiles when more than one dock is shown.",
      control: "number",
    },
  } satisfies ScalarSetting<number>,

  arrivalsPinFirst: {
    kind: "scalar",
    param: "a.pinFirst",
    scope: "arrivals",
    defaultValue: true,
    parse: parseBooleanFlag,
    serialize: (value: boolean) => (value ? "true" : "false"),
    isDefault: (value: boolean) => value,
    url: true,
    form: true,
    ui: {
      label: "Pin first arrival",
      help: "Unattended only. Keep the next service visible while later rows rotate.",
      control: "select",
      options: [
        { value: "true", label: "Pin first" },
        { value: "false", label: "Rotate equally" },
      ],
    },
  } satisfies ScalarSetting<boolean>,

  statusSurface: {
    kind: "scalar",
    param: "s.surface",
    scope: "status",
    defaultValue: "display" as BoardStatusSurface,
    parse: parseStatusSurface,
    serialize: (value: BoardStatusSurface) => value,
    isDefault: (value: BoardStatusSurface) => value === "display",
    url: true,
    form: true,
    ui: {
      label: "Status surface",
      control: "select",
      options: [
        { value: "display", label: "Vertical tiles" },
        { value: "strip", label: "Horizontal strip" },
      ],
    },
  } satisfies ScalarSetting<BoardStatusSurface>,

  statusTiles: {
    kind: "scalar",
    param: "s.tiles",
    scope: "status",
    defaultValue: 4,
    parse: parseRowsItem,
    serialize: (value: number) => serializeRowsItem(value),
    isDefault: (value: number) => value === 4,
    url: true,
    form: true,
    ui: {
      label: "Status tiles",
      help: "Fixed height in arrivals-row tiles. 1 is summary only.",
      control: "number",
    },
  } satisfies ScalarSetting<number>,

  statusLines: {
    kind: "list",
    param: "s.lines",
    scope: "status",
    defaultValue: [] as readonly string[],
    parseItem: parseLineIdItem,
    serializeItem: serializeLineIdItem,
    isDefault: (value: readonly string[]) => value.length === 0,
    url: true,
    form: true,
    ui: {
      label: "Status lines (optional)",
      help: "Comma-separated line ids for detail. Leave blank for every fetched line.",
      control: "text",
    },
  } satisfies ListSetting<readonly string[]>,

  statusOverview: {
    kind: "scalar",
    param: "s.overview",
    scope: "status",
    defaultValue: "network" as BoardStatusOverview,
    parse: parseStatusOverview,
    serialize: (value: BoardStatusOverview) => value,
    isDefault: (value: BoardStatusOverview) => value === "network",
    url: true,
    form: true,
    ui: {
      label: "Status overview",
      control: "select",
      options: [
        { value: "network", label: "Network" },
        { value: "selection", label: "Selection" },
        { value: "none", label: "None" },
      ],
    },
  } satisfies ScalarSetting<BoardStatusOverview>,

  statusDwell: {
    kind: "scalar",
    param: "s.dwell",
    scope: "status",
    defaultValue: undefined as number | undefined,
    parse: parseDwellSeconds,
    serialize: (value: number | undefined) =>
      value === undefined ? "" : String(value),
    isDefault: (value: number | undefined) => value === undefined,
    url: true,
    form: true,
    ui: {
      label: "Status dwell (seconds)",
      help: "Override the shared 10-second reading interval.",
      control: "number",
    },
  } satisfies ScalarSetting<number | undefined>,
} as const;

export type BoardSettingId = keyof typeof BOARD_SETTINGS;

/** Settings that appear in the URL codec. */
export const URL_BOARD_SETTING_IDS = (
  Object.keys(BOARD_SETTINGS) as BoardSettingId[]
).filter((id) => BOARD_SETTINGS[id].url);

/** Settings the Config form may render (must also be `url: true`). */
export const FORM_BOARD_SETTING_IDS = (
  Object.keys(BOARD_SETTINGS) as BoardSettingId[]
).filter((id) => BOARD_SETTINGS[id].form);

/**
 * Parse `a.rows`: scalar number, or positional list (empty slots → undefined).
 * Invalid items become undefined (caller substitutes default when resolving).
 */
export const parseArrivalsRows = (
  raw: string | null,
): number | readonly (number | undefined)[] | undefined => {
  if (raw === null) return undefined;
  const parts = splitCommaList(raw);
  if (parts.length === 0) return undefined;
  if (parts.length === 1) {
    const only = parts[0] ?? "";
    if (!only) return undefined;
    return parseRowsItem(only);
  }
  return parts.map((part) => (part ? parseRowsItem(part) : undefined));
};

export const serializeArrivalsRows = (
  value: number | readonly (number | undefined)[],
): string | undefined => {
  if (typeof value === "number") {
    return serializeRowsItem(value);
  }
  if (value.length === 0) return undefined;
  if (value.every((item) => item === undefined)) return undefined;
  return value
    .map((item) =>
      item === undefined ? "" : serializeRowsItem(item),
    )
    .join(",");
};

/** Parse `a.lines`: normalize, dedupe first-wins, drop unknown IDs. */
export const parseArrivalsLines = (
  raw: string | null,
): readonly string[] | undefined => {
  if (raw === null) return undefined;
  const parts = splitCommaList(raw);
  if (parts.length === 0) return undefined;
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const part of parts) {
    const id = parseLineIdItem(part);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  return ordered.length > 0 ? ordered : undefined;
};

export const serializeArrivalsLines = (
  value: readonly string[] | undefined,
): string | undefined => {
  if (!value?.length) return undefined;
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const raw of value) {
    const id = parseLineIdItem(raw);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  return ordered.length > 0 ? ordered.join(",") : undefined;
};
