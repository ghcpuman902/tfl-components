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
  type BoardSettingId,
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

/**
 * One hash-fragment param that will appear in the shareable URL.
 * `setting` maps back to the Config form field (or the key slot).
 * `text` is the literal `param=value` slice (commas already decoded).
 */
export type BoardHrefSegment = {
  setting: BoardSettingId | "key";
  text: string;
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
 * Encode a param=value pair the same way `URLSearchParams` would, then leave
 * commas literal so list values stay readable in the fragment.
 */
const encodeSegment = (param: string, value: string): string =>
  new URLSearchParams({ [param]: value }).toString().replace(/%2C/gi, ",");

const KNOWN_HASH_PARAMS = new Set<string>([
  BOARD_SETTINGS.stop.param,
  BOARD_SETTINGS.stopName.param,
  BOARD_SETTINGS.mode.param,
  BOARD_SETTINGS.fit.param,
  BOARD_SETTINGS.arrivalsRows.param,
  BOARD_SETTINGS.arrivalsLines.param,
  "key",
]);

/** Unknown fragment params, encoded the same way as known segments. */
export const collectUnknownBoardParams = (
  input: string | URLSearchParams,
): string[] => {
  const params = paramsFromInput(input);
  const extras: string[] = [];
  for (const [key, value] of params) {
    if (KNOWN_HASH_PARAMS.has(key)) continue;
    extras.push(encodeSegment(key, value));
  }
  return extras;
};

const mergeBoardConfig = (
  next: Partial<BoardConfig>,
  base: BoardConfig,
): BoardConfig => ({
  ...base,
  ...next,
  arrivals: {
    ...base.arrivals,
    ...next.arrivals,
  },
});

/**
 * Ordered hash segments that will appear in the shareable URL.
 * Same omit-default rules as `buildBoardHref` — shared so the Config legend
 * and the Launch URL never drift.
 */
export const describeBoardHrefSegments = (
  next: Partial<BoardConfig> = {},
  base: BoardConfig = DEFAULT_BOARD_CONFIG,
): BoardHrefSegment[] => {
  const merged = mergeBoardConfig(next, base);
  const segments: BoardHrefSegment[] = [];

  if (merged.stop) {
    segments.push({
      setting: "stop",
      text: encodeSegment(BOARD_SETTINGS.stop.param, merged.stop),
    });
  }
  if (merged.stopName) {
    segments.push({
      setting: "stopName",
      text: encodeSegment(BOARD_SETTINGS.stopName.param, merged.stopName),
    });
  }
  if (!BOARD_SETTINGS.mode.isDefault(merged.mode)) {
    segments.push({
      setting: "mode",
      text: encodeSegment(BOARD_SETTINGS.mode.param, merged.mode),
    });
  }
  if (!BOARD_SETTINGS.fit.isDefault(merged.fit)) {
    segments.push({
      setting: "fit",
      text: encodeSegment(BOARD_SETTINGS.fit.param, merged.fit),
    });
  }

  // Any explicit a.rows (scalar broadcast or list) serializes; empty omits.
  if (merged.arrivals.rows !== undefined) {
    if (typeof merged.arrivals.rows === "number") {
      const rowsSerialized = serializeArrivalsRows(merged.arrivals.rows);
      if (rowsSerialized !== undefined) {
        segments.push({
          setting: "arrivalsRows",
          text: encodeSegment(
            BOARD_SETTINGS.arrivalsRows.param,
            rowsSerialized,
          ),
        });
      }
    } else {
      const listSerialized = serializeArrivalsRows(merged.arrivals.rows);
      if (listSerialized !== undefined) {
        segments.push({
          setting: "arrivalsRows",
          text: encodeSegment(
            BOARD_SETTINGS.arrivalsRows.param,
            listSerialized,
          ),
        });
      }
    }
  }

  const linesSerialized = serializeArrivalsLines(merged.arrivals.lineOrder);
  if (linesSerialized !== undefined) {
    segments.push({
      setting: "arrivalsLines",
      text: encodeSegment(BOARD_SETTINGS.arrivalsLines.param, linesSerialized),
    });
  }

  if (merged.key) {
    segments.push({
      setting: "key",
      text: encodeSegment("key", merged.key),
    });
  }

  return segments;
};

/**
 * Build a shareable `/board/view#…` href.
 * Omits default mode/fit/arrivals. Empty config yields the bare path.
 * Key is always serialized last when present.
 */
export const buildBoardHref = (
  next: Partial<BoardConfig> = {},
  base: BoardConfig = DEFAULT_BOARD_CONFIG,
): string => {
  const segments = describeBoardHrefSegments(next, base);
  if (segments.length === 0) return BOARD_VIEW_PATH;
  return `${BOARD_VIEW_PATH}#${segments.map((segment) => segment.text).join("&")}`;
};

/** Hash fragment for a config (`#stop=…`), or `""` when the path is bare. */
export const boardHashFromConfig = (
  next: Partial<BoardConfig> = {},
  base: BoardConfig = DEFAULT_BOARD_CONFIG,
): string => {
  const href = buildBoardHref(next, base);
  const index = href.indexOf("#");
  return index === -1 ? "" : href.slice(index);
};

/**
 * Parse then re-serialize a hash so common mistakes become the canonical
 * fragment: trim, clamp, drop invalid slots / unknown line ids, omit
 * default mode/fit, strip empty values. Unknown params are kept (J10
 * forward-compat) and sit just before `key`.
 */
export const normalizeBoardHash = (
  input: string | URLSearchParams = "",
  override: Partial<BoardConfig> = {},
): string => {
  const parsed = parseBoardConfig(input);
  const config = mergeBoardConfig(override, parsed);
  const segments = describeBoardHrefSegments(config);
  const extras = collectUnknownBoardParams(input);
  const texts = segments.map((segment) => segment.text);
  if (extras.length > 0) {
    const keyIndex = segments.findIndex((segment) => segment.setting === "key");
    if (keyIndex === -1) {
      texts.push(...extras);
    } else {
      texts.splice(keyIndex, 0, ...extras);
    }
  }
  return texts.length === 0 ? "" : `#${texts.join("&")}`;
};
