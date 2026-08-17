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
  parseBehaviour,
  parseBooleanFlag,
  parseDwellSeconds,
  parseOptionalString,
  parsePinAdvance,
  parseRowsItem,
  parseStatusOverview,
  parseStatusSurface,
  serializeArrivalsLines,
  serializeArrivalsRows,
  type BoardBehaviour,
  type BoardPinAdvance,
  type BoardSettingId,
  type BoardStatusOverview,
  type BoardStatusSurface,
} from "@/lib/tfl/board-settings";

export const BOARD_PATH = "/board";
export const BOARD_VIEW_PATH = "/board/view";

export type { BoardBehaviour, BoardPinAdvance, BoardStatusOverview, BoardStatusSurface };

export type BoardArrivalsConfig = {
  /**
   * Rows visible per bound. Scalar broadcasts to every line; a list maps by
   * effective line order (explicit `lineOrder`, else offline serving order).
   */
  rows?: number | readonly (number | undefined)[];
  /** Explicit line section order. Ordering only — does not filter. */
  lineOrder?: readonly string[];
  pinFirst?: boolean;
  pinAdvance?: BoardPinAdvance;
};

export type BoardStatusConfig = {
  surface?: BoardStatusSurface;
  tiles?: number;
  lines?: readonly string[];
  overview?: BoardStatusOverview;
  dwell?: number;
};

export type BoardConfig = {
  key?: string;
  stop?: string;
  stopName?: string;
  behaviour: BoardBehaviour;
  arrivals: BoardArrivalsConfig;
  status: BoardStatusConfig;
};

export const DEFAULT_BOARD_CONFIG: BoardConfig = {
  behaviour: BOARD_SETTINGS.behaviour.defaultValue,
  arrivals: {},
  status: {},
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
  const behaviour =
    parseBehaviour(params.get("behaviour") ?? "") ??
    parseBehaviour(params.get("mode") ?? "") ??
    DEFAULT_BOARD_CONFIG.behaviour;

  const arrivals: BoardArrivalsConfig = {};
  const rows = parseArrivalsRows(params.get("a.rows"));
  if (rows !== undefined) arrivals.rows = rows;
  const lineOrder = parseArrivalsLines(params.get("a.lines"));
  if (lineOrder !== undefined) arrivals.lineOrder = lineOrder;
  const pinFirst = parseBooleanFlag(params.get("a.pinFirst") ?? "");
  if (pinFirst !== undefined) arrivals.pinFirst = pinFirst;
  const pinAdvance = parsePinAdvance(params.get("a.pinAdvance") ?? "");
  if (pinAdvance !== undefined) arrivals.pinAdvance = pinAdvance;

  const status: BoardStatusConfig = {};
  const surface = parseStatusSurface(params.get("s.surface") ?? "");
  if (surface !== undefined) status.surface = surface;
  const tiles = parseRowsItem(params.get("s.tiles") ?? "");
  if (tiles !== undefined) status.tiles = Math.max(1, tiles);
  const statusLines = parseArrivalsLines(params.get("s.lines"));
  if (statusLines !== undefined) status.lines = statusLines;
  const overview = parseStatusOverview(params.get("s.overview") ?? "");
  if (overview !== undefined) status.overview = overview;
  const dwell = parseDwellSeconds(params.get("s.dwell") ?? "");
  if (dwell !== undefined) status.dwell = dwell;

  return {
    key,
    stop,
    stopName,
    behaviour,
    arrivals,
    status,
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
  BOARD_SETTINGS.behaviour.param,
  BOARD_SETTINGS.arrivalsRows.param,
  BOARD_SETTINGS.arrivalsLines.param,
  BOARD_SETTINGS.arrivalsPinFirst.param,
  BOARD_SETTINGS.statusSurface.param,
  BOARD_SETTINGS.statusTiles.param,
  BOARD_SETTINGS.statusLines.param,
  BOARD_SETTINGS.statusOverview.param,
  BOARD_SETTINGS.statusDwell.param,
  "mode",
  "fit",
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
  status: {
    ...base.status,
    ...next.status,
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
  if (!BOARD_SETTINGS.behaviour.isDefault(merged.behaviour)) {
    segments.push({
      setting: "behaviour",
      text: encodeSegment(BOARD_SETTINGS.behaviour.param, merged.behaviour),
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

  if (
    merged.arrivals.pinFirst !== undefined &&
    !BOARD_SETTINGS.arrivalsPinFirst.isDefault(merged.arrivals.pinFirst)
  ) {
    segments.push({
      setting: "arrivalsPinFirst",
      text: encodeSegment(
        BOARD_SETTINGS.arrivalsPinFirst.param,
        BOARD_SETTINGS.arrivalsPinFirst.serialize(merged.arrivals.pinFirst),
      ),
    });
  }

  if (
    merged.arrivals.pinAdvance !== undefined &&
    !BOARD_SETTINGS.arrivalsPinAdvance.isDefault(merged.arrivals.pinAdvance)
  ) {
    segments.push({
      setting: "arrivalsPinAdvance",
      text: encodeSegment(
        BOARD_SETTINGS.arrivalsPinAdvance.param,
        BOARD_SETTINGS.arrivalsPinAdvance.serialize(merged.arrivals.pinAdvance),
      ),
    });
  }

  if (
    merged.status.surface !== undefined &&
    !BOARD_SETTINGS.statusSurface.isDefault(merged.status.surface)
  ) {
    segments.push({
      setting: "statusSurface",
      text: encodeSegment(
        BOARD_SETTINGS.statusSurface.param,
        merged.status.surface,
      ),
    });
  }
  if (
    merged.status.tiles !== undefined &&
    !BOARD_SETTINGS.statusTiles.isDefault(merged.status.tiles)
  ) {
    segments.push({
      setting: "statusTiles",
      text: encodeSegment(
        BOARD_SETTINGS.statusTiles.param,
        BOARD_SETTINGS.statusTiles.serialize(merged.status.tiles),
      ),
    });
  }
  const statusLinesSerialized = serializeArrivalsLines(merged.status.lines);
  if (statusLinesSerialized !== undefined) {
    segments.push({
      setting: "statusLines",
      text: encodeSegment(
        BOARD_SETTINGS.statusLines.param,
        statusLinesSerialized,
      ),
    });
  }
  if (
    merged.status.overview !== undefined &&
    !BOARD_SETTINGS.statusOverview.isDefault(merged.status.overview)
  ) {
    segments.push({
      setting: "statusOverview",
      text: encodeSegment(
        BOARD_SETTINGS.statusOverview.param,
        merged.status.overview,
      ),
    });
  }
  if (
    merged.status.dwell !== undefined &&
    !BOARD_SETTINGS.statusDwell.isDefault(merged.status.dwell)
  ) {
    segments.push({
      setting: "statusDwell",
      text: encodeSegment(
        BOARD_SETTINGS.statusDwell.param,
        BOARD_SETTINGS.statusDwell.serialize(merged.status.dwell),
      ),
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
 * Omits default behaviour/arrivals/status. Empty config yields the bare path.
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
 * default behaviour, strip empty values. Unknown params are kept (J10)
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
