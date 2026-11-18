/**
 * Short Board links: `/b/<slug>` carries the whole Board hash, minus the key.
 * No storage: the slug is the canonical hash, tokenised and base64url'd, so
 * a link works for as long as this codec does. `v1` tokens are frozen; a new
 * table needs a new version prefix so old links keep decoding.
 */

import {
  boardHashFromConfig,
  parseBoardConfig,
  type BoardConfig,
} from "@/lib/tfl/board-url-state"

export const BOARD_SHORT_PATH = "/b"
const VERSION = "1"
const MAX_SLUG_LENGTH = 600

/** Frozen v1 table. Append only, never reorder: index = byte - 0x80. */
const V1_TOKENS = [
  "stop=940GZZLU",
  "stop=940GZZ",
  "stop=910G",
  "stop=HUB",
  "stop=",
  "&stopName=",
  "&p1=",
  "&p2=",
  "&behaviour=unattended",
  "&view=glance",
  "&a.rows=",
  "&a.lines=",
  "&a.pinFirst=false",
  "&a.priority=",
  "&a.pair=true",
  "&b.stop=490",
  "&b.stop=",
  "&b.routes=",
  "&b.rows=",
  "&r.stop=",
  "&r.rows=",
  "&c.docks=",
  "&c.surface=",
  "&c.tiles=",
  "&s.surface=",
  "&s.tiles=",
  "&s.lines=",
  "&s.overview=",
  "&s.dwell=",
  ",BikePoints_",
  "BikePoints_",
  "rail",
  "bus",
  "cycle",
  "status",
  "river",
  "bakerloo",
  "central",
  "circle",
  "district",
  "hammersmith-city",
  "jubilee",
  "metropolitan",
  "northern",
  "piccadilly",
  "victoria",
  "waterloo-city",
  "elizabeth",
  "dlr",
  "liberty",
  "lioness",
  "mildmay",
  "suffragette",
  "weaver",
  "windrush",
  "tram",
  "+St.+",
  "+Street",
  "+Station",
  "+Cross",
  "%27s",
  "+Road",
  "+Circus",
] as const

const SORTED_TOKENS = V1_TOKENS.map((text, index) => ({
  text,
  byte: 0x80 + index,
})).sort((a, b) => b.text.length - a.text.length)

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

const fromBase64Url = (text: string): Uint8Array | null => {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"))
    return Uint8Array.from(binary, (char) => char.charCodeAt(0))
  } catch {
    return null
  }
}

const tokenise = (canonical: string): Uint8Array => {
  const out: number[] = []
  let i = 0
  while (i < canonical.length) {
    const token = SORTED_TOKENS.find(({ text }) =>
      canonical.startsWith(text, i)
    )
    if (token) {
      out.push(token.byte)
      i += token.text.length
    } else {
      out.push(canonical.charCodeAt(i))
      i += 1
    }
  }
  return Uint8Array.from(out)
}

const expand = (bytes: Uint8Array): string | null => {
  let out = ""
  for (const byte of bytes) {
    if (byte < 0x80) {
      if (byte < 0x21) return null
      out += String.fromCharCode(byte)
      continue
    }
    const token = V1_TOKENS[byte - 0x80]
    if (!token) return null
    out += token
  }
  return out
}

type NameLookup = (stopId: string) => string | undefined

/** The shared part of a config: everything except the visitor's key. */
const shareableConfig = (
  config: Partial<BoardConfig>,
  lookupName?: NameLookup
): Partial<BoardConfig> => {
  const derivable =
    config.stop &&
    config.stopName &&
    lookupName?.(config.stop) === config.stopName
  return {
    ...config,
    key: undefined,
    stopName: derivable ? undefined : config.stopName,
  }
}

/** `null` when the config has nothing worth sharing (no stop). */
export const encodeBoardShortSlug = (
  config: Partial<BoardConfig>,
  lookupName?: NameLookup
): string | null => {
  if (!config.stop) return null
  const canonical = boardHashFromConfig(
    shareableConfig(config, lookupName)
  ).slice(1)
  if (!canonical) return null
  return `${VERSION}${toBase64Url(tokenise(canonical))}`
}

export type DecodedBoardShortLink = {
  /** Board hash without `#`, stop name restored when the index knows it. */
  hash: string
  config: BoardConfig
}

/**
 * Inverse of `encodeBoardShortSlug`. Anything that is not exactly what the
 * encoder would write (wrong version, junk bytes, non-canonical hash, a key)
 * is `null`, so a bad slug is a clean 404 and every link has one spelling.
 */
export const decodeBoardShortSlug = (
  slug: string,
  lookupName?: NameLookup
): DecodedBoardShortLink | null => {
  if (!slug || slug.length > MAX_SLUG_LENGTH || slug[0] !== VERSION) return null
  const bytes = fromBase64Url(slug.slice(1))
  if (!bytes || bytes.length === 0) return null
  const canonical = expand(bytes)
  if (!canonical) return null
  const parsed = parseBoardConfig(canonical)
  if (!parsed.stop || parsed.key) return null
  if (boardHashFromConfig(parsed).slice(1) !== canonical) return null
  if (encodeBoardShortSlug(parsed, lookupName) !== slug) return null
  const config: BoardConfig = parsed.stopName
    ? parsed
    : { ...parsed, stopName: lookupName?.(parsed.stop) }
  return { hash: boardHashFromConfig(config).slice(1), config }
}

export const boardShortPath = (slug: string): string =>
  `${BOARD_SHORT_PATH}/${slug}`
