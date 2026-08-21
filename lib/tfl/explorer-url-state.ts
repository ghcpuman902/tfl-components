/**
 * Stable URL state for `/docs/explorer`.
 * Hierarchy lives in the path; `view` / `q` stay as query chrome.
 * Invalid segments fall back safely — never throw.
 * Legacy `?kind=&domain=&id=&dir=` is still parsed for redirects.
 * Legacy `?tab=` is ignored (Browse/Find tabs removed).
 */

export const EXPLORER_PATH = "/docs/explorer"

export type ExplorerKind = "points" | "lines"
export type ExplorerDomain = "tube-rail" | "bus" | "river" | "cycle"
export type ExplorerView = "list" | "map"
export type ExplorerDirection = "inbound" | "outbound"

export type ExplorerState = {
  kind: ExplorerKind
  domain: ExplorerDomain
  view: ExplorerView
  id?: string
  dir: ExplorerDirection
  q?: string
}

export const DEFAULT_EXPLORER_STATE: ExplorerState = {
  kind: "points",
  domain: "tube-rail",
  view: "list",
  dir: "inbound",
}

const KINDS = new Set<ExplorerKind>(["points", "lines"])
const VIEWS = new Set<ExplorerView>(["list", "map"])
const DIRS = new Set<ExplorerDirection>(["inbound", "outbound"])

const POINTS_DOMAINS = new Set<ExplorerDomain>([
  "tube-rail",
  "bus",
  "river",
  "cycle",
])
const LINES_DOMAINS = new Set<ExplorerDomain>(["tube-rail", "bus", "river"])

/** Query keys that used to encode hierarchy — now path segments. */
export const LEGACY_EXPLORER_PATH_KEYS = [
  "kind",
  "domain",
  "id",
  "dir",
] as const

const firstParam = (
  value: string | string[] | undefined
): string | undefined => {
  if (Array.isArray(value)) return value[0]
  return value
}

const parseKind = (raw: string | undefined): ExplorerKind => {
  if (raw && KINDS.has(raw as ExplorerKind)) return raw as ExplorerKind
  return DEFAULT_EXPLORER_STATE.kind
}

const parseDomain = (
  kind: ExplorerKind,
  raw: string | undefined
): ExplorerDomain => {
  if (kind === "lines") {
    if (raw && LINES_DOMAINS.has(raw as ExplorerDomain)) {
      return raw as ExplorerDomain
    }
    return "tube-rail"
  }
  if (raw && POINTS_DOMAINS.has(raw as ExplorerDomain)) {
    return raw as ExplorerDomain
  }
  return "tube-rail"
}

const parseView = (raw: string | undefined): ExplorerView => {
  if (raw && VIEWS.has(raw as ExplorerView)) return raw as ExplorerView
  return DEFAULT_EXPLORER_STATE.view
}

const parseDir = (raw: string | undefined): ExplorerDirection => {
  if (raw && DIRS.has(raw as ExplorerDirection)) {
    return raw as ExplorerDirection
  }
  return DEFAULT_EXPLORER_STATE.dir
}

const parseOptionalString = (raw: string | undefined): string | undefined => {
  const trimmed = raw?.trim()
  return trimmed ? trimmed : undefined
}

/**
 * Line ids are lowercase in the TfL directory (`n97`, not `N97`).
 * Point ids (NaPTAN, BikePoint) keep their original case.
 */
const canonicalExplorerId = (
  kind: ExplorerKind,
  id: string | undefined
): string | undefined => {
  if (!id) return undefined
  return kind === "lines" ? id.toLowerCase() : id
}

const decodeSegment = (raw: string): string => {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

const clampState = (state: ExplorerState): ExplorerState => {
  if (state.kind === "lines" && state.domain === "cycle") {
    return { ...state, domain: "tube-rail" }
  }
  return state
}

export type ExplorerSearchParams = Record<string, string | string[] | undefined>

const getSearchValue = (
  searchParams: ExplorerSearchParams | URLSearchParams,
  key: string
): string | undefined => {
  if (searchParams instanceof URLSearchParams) {
    return searchParams.get(key) ?? undefined
  }
  return firstParam(searchParams[key])
}

/** Parse `view` / `q` query chrome. */
export const parseExplorerChrome = (
  searchParams: ExplorerSearchParams | URLSearchParams
): Pick<ExplorerState, "view" | "q"> => ({
  view: parseView(getSearchValue(searchParams, "view")),
  q: parseOptionalString(getSearchValue(searchParams, "q")),
})

export const mergeExplorerChrome = (
  pathState: ExplorerState,
  searchParams: ExplorerSearchParams | URLSearchParams
): ExplorerState => ({
  ...pathState,
  ...parseExplorerChrome(searchParams),
})

/** Parse Explorer query params with safe fallbacks (legacy + chrome). */
export const parseExplorerState = (
  searchParams: ExplorerSearchParams | URLSearchParams
): ExplorerState => {
  const kind = parseKind(getSearchValue(searchParams, "kind"))
  const domain = parseDomain(kind, getSearchValue(searchParams, "domain"))
  const dir = parseDir(getSearchValue(searchParams, "dir"))
  const id = canonicalExplorerId(
    kind,
    parseOptionalString(getSearchValue(searchParams, "id"))
  )
  const chrome = parseExplorerChrome(searchParams)

  return clampState({ kind, domain, dir, id, ...chrome })
}

/** Parse `/docs/explorer/{kind}/{domain}/{id}/{dir}` path segments. */
export const parseExplorerPath = (
  segments: readonly string[]
): ExplorerState => {
  const decoded = segments.map(decodeSegment).filter(Boolean)
  const kindRaw = decoded[0]
  const kind = kindRaw && KINDS.has(kindRaw as ExplorerKind)
    ? (kindRaw as ExplorerKind)
    : DEFAULT_EXPLORER_STATE.kind
  const domain = parseDomain(kind, decoded[1])
  const idRaw = parseOptionalString(decoded[2])
  const id = canonicalExplorerId(kind, idRaw)
  const dir =
    kind === "lines" ? parseDir(decoded[3]) : DEFAULT_EXPLORER_STATE.dir

  return {
    kind,
    domain,
    view: DEFAULT_EXPLORER_STATE.view,
    dir,
    id,
    q: undefined,
  }
}

/** Parse a full pathname under `/docs/explorer`. */
export const parseExplorerPathname = (pathname: string): ExplorerState => {
  const trimmed =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname
  if (trimmed === EXPLORER_PATH) {
    return parseExplorerPath([])
  }
  const prefix = `${EXPLORER_PATH}/`
  if (!trimmed.startsWith(prefix)) {
    return parseExplorerPath([])
  }
  return parseExplorerPath(trimmed.slice(prefix.length).split("/"))
}

export const hasLegacyExplorerPathQuery = (
  searchParams: URLSearchParams
): boolean => LEGACY_EXPLORER_PATH_KEYS.some((key) => searchParams.has(key))

/**
 * Canonical path (+ chrome query) for a legacy `?kind=&domain=&id=&dir=` URL.
 * Returns null when there is nothing to redirect.
 */
export const legacyExplorerRedirectHref = (
  searchParams: URLSearchParams
): string | null => {
  if (!hasLegacyExplorerPathQuery(searchParams)) return null
  return buildExplorerHref(parseExplorerState(searchParams))
}

/**
 * Build a shareable Explorer href from a base state + partial override.
 * Always includes `kind`. Default domain is omitted when there is no id.
 * `/docs/explorer` still parses as points / tube-rail.
 */
export const buildExplorerHref = (
  next: Partial<ExplorerState>,
  base: ExplorerState = DEFAULT_EXPLORER_STATE
): string => {
  const merged = clampState({
    ...base,
    ...next,
  })

  const id = canonicalExplorerId(merged.kind, merged.id)
  const parts = [EXPLORER_PATH, merged.kind]
  const omitDefaultDomain =
    !id && merged.domain === DEFAULT_EXPLORER_STATE.domain
  if (!omitDefaultDomain) {
    parts.push(merged.domain)
  }
  if (id) {
    parts.push(encodeURIComponent(id))
    if (merged.kind === "lines" && merged.dir !== DEFAULT_EXPLORER_STATE.dir) {
      parts.push(merged.dir)
    }
  }
  const path = parts.join("/")

  const params = new URLSearchParams()
  if (merged.view !== DEFAULT_EXPLORER_STATE.view) {
    params.set("view", merged.view)
  }
  if (merged.q) {
    params.set("q", merged.q)
  }

  const query = params.toString()
  return query ? `${path}?${query}` : path
}

/** Domains available for a given kind. */
export const domainsForKind = (
  kind: ExplorerKind
): readonly ExplorerDomain[] =>
  kind === "lines"
    ? (["tube-rail", "bus", "river"] as const)
    : (["tube-rail", "bus", "river", "cycle"] as const)

export const domainLabel = (domain: ExplorerDomain): string => {
  switch (domain) {
    case "tube-rail":
      return "Tube & rail"
    case "bus":
      return "Bus"
    case "river":
      return "River"
    case "cycle":
      return "Cycle hire"
  }
}

export const kindLabel = (kind: ExplorerKind): string =>
  kind === "points" ? "Points" : "Lines"
