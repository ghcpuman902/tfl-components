/**
 * Stable hash-fragment state for `/board/view`.
 * Invalid params fall back safely — never throw.
 * The TfL key lives in the hash only (never query) so it is not sent to our origin.
 *
 * Setting definitions live in `board-settings.ts`. This module is the codec:
 * parse / serialize / omit defaults. Unknown params are ignored (forward-compatible).
 */

import {
  BOARD_SETTINGS,
  parseArrivalsLines,
  parseArrivalsRows,
  parseFitMode,
  parseInteractionMode,
  parseOptionalString,
  serializeArrivalsLines,
  serializeArrivalsRows,
  type BoardFitMode,
  type BoardInteractionMode,
} from "@/lib/tfl/board-settings";

export const BOARD_PATH = "/board";
export const BOARD_VIEW_PATH = "/board/view";

export type { BoardFitMode, BoardInteractionMode };

export type BoardArrivalsConfig = {
  /**
   * Rows visible per bound. Scalar broadcasts to every line; a list maps by
   * effective line order (explicit `lineOrder`, else offline serving order).
   */
  rows?: number | readonly (number | undefined)[];
  /** Explicit line section order. Ordering only — does not filter. */
  lineOrder?: readonly string[];
};

export type BoardConfig = {
  key?: string;
  stop?: string;
  stopName?: string;
  mode: BoardInteractionMode;
  fit: BoardFitMode;
  arrivals: BoardArrivalsConfig;
};

export const DEFAULT_BOARD_CONFIG: BoardConfig = {
  mode: BOARD_SETTINGS.mode.defaultValue,
  fit: BOARD_SETTINGS.fit.defaultValue,
  arrivals: {},
};

const paramsFromInput = (
  input: string | URLSearchParams,
): URLSearchParams => {
  if (input instanceof URLSearchParams) return input;
  const raw = input.startsWith("#") ? input.slice(1) : input;
  return new URLSearchParams(raw);
};

/** Parse a hash string (`#key=…&stop=…`) or URLSearchParams with safe fallbacks. */
export const parseBoardConfig = (
  input: string | URLSearchParams = "",
): BoardConfig => {
  const params = paramsFromInput(input);

  const stop = parseOptionalString(params.get("stop") ?? "") ?? undefined;
  const stopName =
    parseOptionalString(params.get("stopName") ?? "") ?? undefined;
  const key = parseOptionalString(params.get("key") ?? "") ?? undefined;
  const mode =
    parseInteractionMode(params.get("mode") ?? "") ??
    DEFAULT_BOARD_CONFIG.mode;
  const fit =
    parseFitMode(params.get("fit") ?? "") ?? DEFAULT_BOARD_CONFIG.fit;

  const arrivals: BoardArrivalsConfig = {};
  const rows = parseArrivalsRows(params.get("a.rows"));
  if (rows !== undefined) arrivals.rows = rows;
  const lineOrder = parseArrivalsLines(params.get("a.lines"));
  if (lineOrder !== undefined) arrivals.lineOrder = lineOrder;

  return {
    key,
    stop,
    stopName,
    mode,
    fit,
    arrivals,
  };
};

/**
 * Post-process URLSearchParams.toString() so commas stay literal in the
 * fragment (legal and more readable than `%2C`).
 */
const decodeCommaEncoding = (hash: string): string =>
  hash.replace(/%2C/gi, ",");

/**
 * Build a shareable `/board/view#…` href.
 * Omits default mode/fit/arrivals. Empty config yields the bare path.
 * Key is always serialized last when present.
 */
export const buildBoardHref = (
  next: Partial<BoardConfig> = {},
  base: BoardConfig = DEFAULT_BOARD_CONFIG,
): string => {
  const merged: BoardConfig = {
    ...base,
    ...next,
    arrivals: {
      ...base.arrivals,
      ...next.arrivals,
    },
  };

  const params = new URLSearchParams();

  if (merged.stop) params.set("stop", merged.stop);
  if (merged.stopName) params.set("stopName", merged.stopName);
  if (!BOARD_SETTINGS.mode.isDefault(merged.mode)) {
    params.set("mode", merged.mode);
  }
  if (!BOARD_SETTINGS.fit.isDefault(merged.fit)) {
    params.set("fit", merged.fit);
  }

  const rowsSerialized = serializeArrivalsRows(
    merged.arrivals.rows ?? BOARD_SETTINGS.arrivalsRows.defaultValue,
  );
  // Scalar default (number 3) is omitted; list form always serializes when present.
  if (merged.arrivals.rows !== undefined) {
    if (typeof merged.arrivals.rows === "number") {
      if (rowsSerialized !== undefined) {
        params.set("a.rows", rowsSerialized);
      }
    } else {
      const listSerialized = serializeArrivalsRows(merged.arrivals.rows);
      if (listSerialized !== undefined) {
        params.set("a.rows", listSerialized);
      }
    }
  }

  const linesSerialized = serializeArrivalsLines(merged.arrivals.lineOrder);
  if (linesSerialized !== undefined) {
    params.set("a.lines", linesSerialized);
  }

  if (merged.key) params.set("key", merged.key);

  const hash = decodeCommaEncoding(params.toString());
  return hash ? `${BOARD_VIEW_PATH}#${hash}` : BOARD_VIEW_PATH;
};
