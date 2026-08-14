/**
 * Stable hash-fragment state for `/board/view`.
 * Invalid params fall back safely — never throw.
 * The TfL key lives in the hash only (never query) so it is not sent to our origin.
 */

export const BOARD_PATH = "/board";
export const BOARD_VIEW_PATH = "/board/view";

export type BoardInteractionMode = "static" | "mouse" | "touch";
export type BoardFitMode = "static" | "fill";

export type BoardConfig = {
  key?: string;
  stop?: string;
  stopName?: string;
  mode: BoardInteractionMode;
  fit: BoardFitMode;
};

export const DEFAULT_BOARD_CONFIG: BoardConfig = {
  mode: "static",
  fit: "static",
};

const MODES = new Set<BoardInteractionMode>(["static", "mouse", "touch"]);
const FITS = new Set<BoardFitMode>(["static", "fill"]);

const parseOptionalString = (raw: string | undefined): string | undefined => {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
};

const parseMode = (raw: string | undefined): BoardInteractionMode => {
  if (raw && MODES.has(raw as BoardInteractionMode)) {
    return raw as BoardInteractionMode;
  }
  return DEFAULT_BOARD_CONFIG.mode;
};

const parseFit = (raw: string | undefined): BoardFitMode => {
  if (raw && FITS.has(raw as BoardFitMode)) {
    return raw as BoardFitMode;
  }
  return DEFAULT_BOARD_CONFIG.fit;
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
  return {
    key: parseOptionalString(params.get("key") ?? undefined),
    stop: parseOptionalString(params.get("stop") ?? undefined),
    stopName: parseOptionalString(params.get("stopName") ?? undefined),
    mode: parseMode(params.get("mode") ?? undefined),
    fit: parseFit(params.get("fit") ?? undefined),
  };
};

/**
 * Build a shareable `/board/view#…` href.
 * Omits default mode/fit. Empty config yields the bare path.
 */
export const buildBoardHref = (
  next: Partial<BoardConfig> = {},
  base: BoardConfig = DEFAULT_BOARD_CONFIG,
): string => {
  const merged: BoardConfig = {
    ...base,
    ...next,
  };

  const params = new URLSearchParams();

  if (merged.stop) params.set("stop", merged.stop);
  if (merged.stopName) params.set("stopName", merged.stopName);
  if (merged.mode !== DEFAULT_BOARD_CONFIG.mode) {
    params.set("mode", merged.mode);
  }
  if (merged.fit !== DEFAULT_BOARD_CONFIG.fit) {
    params.set("fit", merged.fit);
  }
  if (merged.key) params.set("key", merged.key);

  const hash = params.toString();
  return hash ? `${BOARD_VIEW_PATH}#${hash}` : BOARD_VIEW_PATH;
};
