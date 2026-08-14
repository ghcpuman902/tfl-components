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

export type BoardScope = "shell" | "arrivals" | "status";

export type BoardInteractionMode = "static" | "mouse" | "touch";
export type BoardFitMode = "static" | "fill";

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

const MODES = new Set<BoardInteractionMode>(["static", "mouse", "touch"]);
const FITS = new Set<BoardFitMode>(["static", "fill"]);
const LINE_ORDER_SET = new Set<string>(LINE_ORDER);

/** Max rows visible per bound (matches `maxRows` default on the arrivals board). */
export const BOARD_ROWS_MAX = 16;

export const parseOptionalString = (raw: string): string | undefined => {
  const trimmed = raw.trim();
  return trimmed ? trimmed : undefined;
};

export const parseInteractionMode = (
  raw: string,
): BoardInteractionMode | undefined => {
  const trimmed = raw.trim();
  return MODES.has(trimmed as BoardInteractionMode)
    ? (trimmed as BoardInteractionMode)
    : undefined;
};

export const parseFitMode = (raw: string): BoardFitMode | undefined => {
  const trimmed = raw.trim();
  return FITS.has(trimmed as BoardFitMode)
    ? (trimmed as BoardFitMode)
    : undefined;
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
    serialize: (value: string) => value,
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
    serialize: (value: string) => value,
    isDefault: (value: string | undefined) => !value,
    url: true,
    form: true,
    ui: {
      label: "Stop name (optional)",
      control: "text",
    },
  } satisfies ScalarSetting<string | undefined>,

  mode: {
    kind: "scalar",
    param: "mode",
    scope: "shell",
    defaultValue: "static" as BoardInteractionMode,
    parse: parseInteractionMode,
    serialize: (value: BoardInteractionMode) => value,
    isDefault: (value: BoardInteractionMode) => value === "static",
    url: true,
    form: false,
    ui: {
      label: "Interactivity",
      control: "select",
      options: [
        { value: "static", label: "Non-interactive" },
        { value: "mouse", label: "Mouse" },
        { value: "touch", label: "Touch" },
      ],
    },
  } satisfies ScalarSetting<BoardInteractionMode>,

  fit: {
    kind: "scalar",
    param: "fit",
    scope: "shell",
    defaultValue: "static" as BoardFitMode,
    parse: parseFitMode,
    serialize: (value: BoardFitMode) => value,
    isDefault: (value: BoardFitMode) => value === "static",
    url: true,
    form: false,
    ui: {
      label: "Fit",
      control: "select",
      options: [
        { value: "static", label: "Natural size" },
        { value: "fill", label: "Fill the screen" },
      ],
    },
  } satisfies ScalarSetting<BoardFitMode>,

  /**
   * Rows visible per bound. Scalar broadcasts; comma list maps by effective
   * line order. The Config form exposes both "All lines" and "Per line".
   */
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
    isDefault: (value: number) => value === RAIL_ARRIVALS_DEFAULT_PAGE_SIZE,
    url: true,
    form: true,
    ui: {
      label: "Rows per bound",
      help: "How many arrivals each compass bound shows at once. Use one value for every line, or a value per serving line. 0 shows every row (no pager).",
      control: "number",
    },
  } satisfies ScalarSetting<number>,

  /**
   * Explicit line order for positional `a.rows` and section order.
   * Ordering only — does not filter. Written by the per-line rows control;
   * no dedicated form field of its own.
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
    form: false,
  } satisfies ListSetting<readonly string[]>,
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
    if (value === RAIL_ARRIVALS_DEFAULT_PAGE_SIZE) return undefined;
    return serializeRowsItem(value);
  }
  if (value.length === 0) return undefined;
  const allDefault = value.every(
    (item) =>
      item === undefined || item === RAIL_ARRIVALS_DEFAULT_PAGE_SIZE,
  );
  if (allDefault) return undefined;
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
