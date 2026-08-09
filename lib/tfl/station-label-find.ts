import { formatStationName } from "@/lib/tfl/diagram-station";
import { STATION_ABBR_FIND_COMPLETIONS } from "@/lib/tfl/station-abbreviations";

export { STATION_ABBR_FIND_COMPLETIONS } from "@/lib/tfl/station-abbreviations";

const APOSTROPHE_RE = /[\u2018\u2019\u02BC']/g;

export const stripStationApostrophes = (value: string): string =>
  value.replace(APOSTROPHE_RE, "");

/** Normalise curly apostrophes to ASCII for alternate find queries. */
export const normalizeStationApostrophes = (value: string): string =>
  value.replace(/[\u2018\u2019\u02BC]/g, "'");

/**
 * Official copy / aria form: single line, full words, no diagram line breaks.
 */
export const stationCopyName = (
  rawName: string,
  accessibleName?: string,
): string => {
  const next = (accessibleName ?? formatStationName(rawName))
    .replace(/\s+/g, " ")
    .trim();
  return next;
};

/** `&` between words → `and` (keeps Heathrow-style `2&3` as `2 and 3`). */
export const stationAndForm = (value: string): string =>
  value
    .replace(/(\d+)\s*&\s*(\d+)/g, "$1 and $2")
    .replace(/\s*&\s*/g, " and ")
    .replace(/\s+/g, " ")
    .trim();

export const findCompletionForToken = (token: string): string | undefined => {
  if (!token || token === "&") return undefined;
  const direct = STATION_ABBR_FIND_COMPLETIONS[token];
  if (direct) return direct;
  const matched = Object.entries(STATION_ABBR_FIND_COMPLETIONS).find(
    ([abbr]) => abbr.toLowerCase() === token.toLowerCase(),
  );
  return matched?.[1];
};

/**
 * Visual line text as find-in-page would see it after abbr completions
 * (e.g. "Liverpool St" → "Liverpool Street").
 */
export const expandStationLineForFind = (line: string): string =>
  line
    .split(/(\s+|&)/)
    .map((part) => {
      const completion = findCompletionForToken(part);
      return completion ? `${part}${completion}` : part;
    })
    .join("");

/**
 * Extra phrases to expose to Cmd/Ctrl+F when they are not already covered by
 * the visible lines + abbreviation expansions. Highlight for these is weak
 * (font-size 0) but match count + scroll-to-station still work.
 */
export const stationFindAliases = (
  copyName: string,
  visualLines: readonly string[],
): string[] => {
  const covered = new Set<string>();
  const visualJoined = visualLines.join(" ").replace(/\s+/g, " ").trim();
  const visualExpanded = visualLines
    .map(expandStationLineForFind)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const remember = (value: string) => {
    const trimmed = value.replace(/\s+/g, " ").trim();
    if (trimmed) covered.add(trimmed.toLowerCase());
  };

  remember(visualJoined);
  remember(visualExpanded);
  remember(expandStationLineForFind(visualJoined));

  const candidates = new Set<string>();
  const add = (value: string) => {
    const trimmed = value.replace(/\s+/g, " ").trim();
    if (!trimmed) return;
    if (covered.has(trimmed.toLowerCase())) return;
    candidates.add(trimmed);
  };

  add(copyName);
  add(stationAndForm(copyName));
  add(normalizeStationApostrophes(copyName));
  add(stripStationApostrophes(copyName));
  add(stationAndForm(stripStationApostrophes(copyName)));
  add(normalizeStationApostrophes(stationAndForm(copyName)));

  add(stationAndForm(visualJoined));
  add(stripStationApostrophes(visualJoined));
  add(normalizeStationApostrophes(visualJoined));

  return [...candidates];
};
