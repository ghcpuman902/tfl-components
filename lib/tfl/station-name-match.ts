/**
 * Shared station-name fold for Board / Explorer search and StationName find.
 *
 * Official names in the Tube / Elizabeth / DLR / Overground / Tram catalogue
 * (457 unique) use ASCII apostrophes, spell Street in full, and write Saint
 * as `St.` or `St`. Search and Ctrl+F should accept the other typing.
 */

import {
  applyStationAbbreviations,
  STATION_ABBREVIATION_ENTRIES,
} from "@/lib/tfl/station-abbreviations"

const DIACRITICS = /\p{M}/gu
const APOSTROPHES = /[\u2018\u2019\u02BC'`´']/g
const NON_ALNUM = /[^a-z0-9]+/g
const POSSESSIVE_S = /[\u2018\u2019\u02BC']s\b/gi
const SOFT_PUNCT = /[.\-()]/g

const replaceWholeToken = (folded: string, from: string, to: string): string =>
  folded.replace(new RegExp(`\\b${from}\\b`, "g"), to)

/** Lowercase, strip diacritics / apostrophes, treat other punctuation as spaces. */
export const foldStationSearchText = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(APOSTROPHES, "")
    .replace(NON_ALNUM, " ")
    .trim()
    .replace(/\s+/g, " ")

/**
 * Visual diagram pairs, plus Saint (search / find only — never painted).
 * `St` in a catalogue name is always Saint; Street is never abbreviated.
 * Shorts are folded so `w'y` / `King's X` match the apostrophe-stripped query.
 */
const SEARCH_LONG_FORMS: readonly (readonly [string, string])[] = [
  ["st", "saint"],
  ...STATION_ABBREVIATION_ENTRIES.flatMap((entry) => {
    const from = foldStationSearchText(entry.short)
    const to = foldStationSearchText(entry.full)
    if (!from || !to || from === to || from.length >= to.length) return []
    return [[from, to] as const]
  }),
]

const expandLongerForms = (
  folded: string,
  pairs: readonly (readonly [string, string])[]
): string[] => {
  const forms = new Set<string>([folded])
  for (const [from, to] of pairs) {
    if (from.length >= to.length) continue
    const next = replaceWholeToken(folded, from, to)
    if (next !== folded) forms.add(next)
  }
  return [...forms]
}

export const stationSearchTokens = (folded: string): readonly string[] =>
  folded.length === 0 ? [] : folded.split(" ")

/** Query tokens appear in order as prefixes of haystack tokens. */
export const stationSearchTokensMatch = (
  haystackTokens: readonly string[],
  queryTokens: readonly string[]
): boolean => {
  if (queryTokens.length === 0) return false
  let index = 0
  for (const queryToken of queryTokens) {
    while (
      index < haystackTokens.length &&
      !haystackTokens[index]!.startsWith(queryToken)
    ) {
      index += 1
    }
    if (index >= haystackTokens.length) return false
    index += 1
  }
  return true
}

/** Folded official name plus Saint-expanded form (`St` → `saint`). */
export const stationSearchNameForms = (name: string): string[] => {
  const folded = foldStationSearchText(name)
  if (!folded) return []
  return expandLongerForms(folded, [["st", "saint"]])
}

/** Folded query plus longer expansions (`st` → street / saint, `rd` → road). */
export const stationSearchQueryForms = (query: string): string[] => {
  const folded = foldStationSearchText(query)
  if (!folded) return []
  return expandLongerForms(folded, SEARCH_LONG_FORMS)
}

const formMatchesQuery = (haystack: string, query: string): boolean => {
  if (!haystack || !query) return false
  if (
    haystack === query ||
    haystack.startsWith(query) ||
    haystack.includes(query)
  ) {
    return true
  }
  return stationSearchTokensMatch(
    stationSearchTokens(haystack),
    stationSearchTokens(query)
  )
}

/**
 * True when `query` should list `name` — punctuation-insensitive, and
 * diagram abbreviations / Saint expand to the official words.
 */
export const stationNameMatchesQuery = (
  name: string,
  query: string
): boolean => {
  const queryForms = stationSearchQueryForms(query)
  if (queryForms.length === 0) return true
  const nameForms = stationSearchNameForms(name)
  if (nameForms.length === 0) return false
  return nameForms.some((haystack) =>
    queryForms.some((needle) => formMatchesQuery(haystack, needle))
  )
}

const pushAlias = (target: Set<string>, value: string): void => {
  const next = value.replace(/\s+/g, " ").trim()
  if (next) target.add(next)
}

const softenStationPunctuation = (value: string): string =>
  value.replace(APOSTROPHES, "").replace(SOFT_PUNCT, " ")

const stripStationPossessive = (value: string): string =>
  value.replace(POSSESSIVE_S, "")

/** `St.` always, or `St` only when another word follows — not trailing Street. */
const expandStationSaint = (value: string): string =>
  value.replace(/\bSt\./g, "Saint").replace(/\bSt\b(?=\s+\S)/g, "Saint")

/**
 * Human-readable variants for `hidden="until-found"` chips. Chrome find is a
 * literal substring, so apostrophes, `St.`, hyphens, and Saint need copies.
 */
export const stationSearchAliasForms = (name: string): string[] => {
  const forms = new Set<string>()
  const add = (value: string) => pushAlias(forms, value)

  add(name)
  add(name.replace(/\s*&\s*/g, " and "))
  add(name.replace(APOSTROPHES, ""))
  add(softenStationPunctuation(name))
  add(softenStationPunctuation(stripStationPossessive(name)))
  add(expandStationSaint(name))
  add(expandStationSaint(name.replace(APOSTROPHES, "")))
  add(softenStationPunctuation(expandStationSaint(name)))
  add(
    softenStationPunctuation(stripStationPossessive(expandStationSaint(name)))
  )
  add(applyStationAbbreviations(name))
  add(applyStationAbbreviations(softenStationPunctuation(name)))

  return [...forms]
}
