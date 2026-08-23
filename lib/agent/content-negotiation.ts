export type NegotiatedContentType = "html" | "markdown" | "not-acceptable"

type MediaRange = {
  type: string
  subtype: string
  quality: number
  order: number
}

const parseQuality = (value: string | undefined): number => {
  if (value === undefined) return 1
  const quality = Number(value)
  if (!Number.isFinite(quality)) return 0
  return Math.min(1, Math.max(0, quality))
}

const parseAccept = (accept: string | null): MediaRange[] => {
  if (!accept?.trim()) {
    return [{ type: "*", subtype: "*", quality: 1, order: 0 }]
  }

  return accept.split(",").map((part, order) => {
    const [mediaType = "", ...parameters] = part.trim().split(";")
    const [type = "", subtype = ""] = mediaType.toLowerCase().split("/")
    const qualityParameter = parameters
      .map((parameter) => parameter.trim().split("="))
      .find(([name]) => name?.toLowerCase() === "q")

    return {
      type,
      subtype,
      quality: parseQuality(qualityParameter?.[1]),
      order,
    }
  })
}

const matchSpecificity = (
  range: MediaRange,
  type: string,
  subtype: string
): number => {
  if (range.type === type && range.subtype === subtype) return 2
  if (range.type === type && range.subtype === "*") return 1
  if (range.type === "*" && range.subtype === "*") return 0
  return -1
}

const qualityFor = (
  ranges: readonly MediaRange[],
  type: string,
  subtype: string
): { quality: number; order: number; specificity: number } => {
  const matches = ranges
    .map((range) => ({
      quality: range.quality,
      order: range.order,
      specificity: matchSpecificity(range, type, subtype),
    }))
    .filter((match) => match.specificity >= 0)
    .sort(
      (a, b) =>
        b.specificity - a.specificity ||
        b.quality - a.quality ||
        a.order - b.order
    )

  return (
    matches[0] ?? {
      quality: 0,
      order: Number.MAX_SAFE_INTEGER,
      specificity: -1,
    }
  )
}

/** Select between the two representations published for the homepage. */
export const negotiateHomepageContent = (
  accept: string | null
): NegotiatedContentType => {
  const ranges = parseAccept(accept)
  const html = qualityFor(ranges, "text", "html")
  const markdown = qualityFor(ranges, "text", "markdown")

  if (html.quality <= 0 && markdown.quality <= 0) return "not-acceptable"
  if (markdown.quality > html.quality) return "markdown"
  if (html.quality > markdown.quality) return "html"

  if (markdown.specificity > html.specificity) return "markdown"
  return "html"
}

export const mergeVary = (current: string | null, value: string): string => {
  const fields = new Map<string, string>()
  for (const field of `${current ?? ""},${value}`.split(",")) {
    const trimmed = field.trim()
    if (!trimmed) continue
    fields.set(trimmed.toLowerCase(), trimmed)
  }
  return [...fields.values()].join(", ")
}

/** Skip representation negotiation for RSC fetches and non-GET requests. */
export const isHomepageRepresentationRequest = (
  method: string,
  accept: string | null,
  fetchDestination: string | null
): boolean => {
  if (method !== "GET" && method !== "HEAD") return false
  if (accept?.toLowerCase().includes("text/x-component")) return false
  return !fetchDestination || fetchDestination === "document"
}

const KNOWN_TOP_LEVEL_PATHS = new Set([
  "about",
  "accessibility",
  "api",
  "apple-icon",
  "blocks",
  "board",
  "contact",
  "credits",
  "docs",
  "drafts",
  "explore",
  "foundations",
  "how-it-was-built",
  "icon.svg",
  "index.md",
  "interfaces",
  "labs",
  "licence",
  "llms.txt",
  "maps",
  "observatory",
  "opengraph-image.png",
  "openapi.json",
  "primitives",
  "privacy",
  "r",
  "robots.txt",
  "sitemap.xml",
  "temp",
  "tools",
])

/** A conservative check used only to give Markdown clients a useful 404. */
export const hasUnknownTopLevelPath = (pathname: string): boolean => {
  const firstSegment = pathname.split("/").filter(Boolean)[0]
  return Boolean(firstSegment && !KNOWN_TOP_LEVEL_PATHS.has(firstSegment))
}
