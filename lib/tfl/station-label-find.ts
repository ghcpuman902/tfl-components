import { formatStationName } from "@/lib/tfl/diagram-station"
import { neededFindPhrases, normalizeFindPhrase } from "@/lib/tfl/find-coverage"
import { STATION_ABBR_FIND_COMPLETIONS } from "@/lib/tfl/station-abbreviations"

export { STATION_ABBR_FIND_COMPLETIONS } from "@/lib/tfl/station-abbreviations"
export {
  isFindCovered,
  neededFindPhrases,
  normalizeFindPhrase,
  shouldExposeFindPhrase,
} from "@/lib/tfl/find-coverage"

const APOSTROPHE_RE = /[\u2018\u2019\u02BC']/g

export const stripStationApostrophes = (value: string): string =>
  value.replace(APOSTROPHE_RE, "")

/** Normalise curly apostrophes to ASCII for alternate find queries. */
export const normalizeStationApostrophes = (value: string): string =>
  value.replace(/[\u2018\u2019\u02BC]/g, "'")

/**
 * Official copy / aria form: single line, full words, no diagram line breaks.
 */
export const stationCopyName = (
  rawName: string,
  accessibleName?: string
): string => {
  const next = (accessibleName ?? formatStationName(rawName))
    .replace(/\s+/g, " ")
    .trim()
  return next
}

/** `&` between words → `and` (keeps Heathrow-style `2&3` as `2 and 3`). */
export const stationAndForm = (value: string): string =>
  value
    .replace(/(\d+)\s*&\s*(\d+)/g, "$1 and $2")
    .replace(/\s*&\s*/g, " and ")
    .replace(/\s+/g, " ")
    .trim()

export const findCompletionForToken = (token: string): string | undefined => {
  if (!token || token === "&") return undefined
  const direct = STATION_ABBR_FIND_COMPLETIONS[token]
  if (direct) return direct
  const matched = Object.entries(STATION_ABBR_FIND_COMPLETIONS).find(
    ([abbr]) => abbr.toLowerCase() === token.toLowerCase()
  )
  return matched?.[1]
}

/**
 * Visual line text as find-in-page would see it after abbr completions
 * (e.g. "Liverpool St" → "Liverpool Street").
 */
export const expandStationLineForFind = (line: string): string =>
  line
    .split(/(\s+|&)/)
    .map((part) => {
      const completion = findCompletionForToken(part)
      return completion ? `${part}${completion}` : part
    })
    .join("")

/**
 * Phrases already contiguous in the DOM for Cmd/Ctrl+F.
 * Multi-line paint inserts `<br>`, which breaks matching across lines — so a
 * joined expansion is NOT treated as covered when there is more than one line.
 */
export const stationFindCoveredPhrases = (
  visualLines: readonly string[]
): string[] => {
  const covered: string[] = []
  for (const line of visualLines) {
    const trimmed = normalizeFindPhrase(line)
    if (trimmed) covered.push(trimmed)
    const expanded = normalizeFindPhrase(expandStationLineForFind(line))
    if (expanded) covered.push(expanded)
  }
  if (visualLines.length === 1) {
    const only = visualLines[0] ?? ""
    const joined = normalizeFindPhrase(expandStationLineForFind(only))
    if (joined) covered.push(joined)
  }
  return covered
}

/**
 * Extra phrases to expose to Cmd/Ctrl+F when they are not already covered by
 * contiguous DOM text (visible lines + inline abbreviation completions).
 * StationName renders these with `hidden="until-found"` (findable; shows on match).
 *
 * Contract: copy / aria / find all keep the canonical single-line full name,
 * even when the paint wraps or abbreviates (`<br>` breaks cross-line find).
 */
export const stationFindAliases = (
  copyName: string,
  visualLines: readonly string[]
): string[] => {
  const covered = stationFindCoveredPhrases(visualLines)
  const visualJoined = normalizeFindPhrase(visualLines.join(" "))

  return neededFindPhrases(
    [
      copyName,
      stationAndForm(copyName),
      normalizeStationApostrophes(copyName),
      stripStationApostrophes(copyName),
      stationAndForm(stripStationApostrophes(copyName)),
      normalizeStationApostrophes(stationAndForm(copyName)),
      stationAndForm(visualJoined),
      stripStationApostrophes(visualJoined),
      normalizeStationApostrophes(visualJoined),
    ],
    covered
  )
}
