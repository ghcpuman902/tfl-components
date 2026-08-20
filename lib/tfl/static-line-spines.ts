/**
 * Ordered outbound spines used when live `getRouteSequence` returns empty.
 * Naptan IDs match TfL stop points so disruption mapping still works.
 *
 * Note: tfl-ts does not currently ship build-time route sequences (only line
 * catalogue meta). These app-owned spines fill that gap until a package-level
 * bake exists.
 */

export type StaticLineSpine = {
  lineId: string
  lineName: string
  /** Outbound terminal → terminal naptan order */
  naptanIds: readonly string[]
}

/** Bakerloo outbound: Harrow & Wealdstone → Elephant & Castle */
export const BAKERLOO_OUTBOUND_SPINE = [
  "940GZZLUHAW", // Harrow & Wealdstone
  "940GZZLUKEN", // Kenton
  "940GZZLUSKT", // South Kenton
  "940GZZLUNWY", // North Wembley
  "940GZZLUWYC", // Wembley Central
  "940GZZLUSGP", // Stonebridge Park
  "940GZZLUHSN", // Harlesden
  "940GZZLUWJN", // Willesden Junction
  "940GZZLUKSL", // Kensal Green
  "940GZZLUQPS", // Queen's Park
  "940GZZLUKPK", // Kilburn Park
  "940GZZLUMVL", // Maida Vale
  "940GZZLUWKA", // Warwick Avenue
  "940GZZLUPAC", // Paddington
  "940GZZLUERB", // Edgware Road (Bakerloo)
  "940GZZLUMYB", // Marylebone
  "940GZZLUBST", // Baker Street
  "940GZZLURGP", // Regent's Park
  "940GZZLUOXC", // Oxford Circus
  "940GZZLUPCC", // Piccadilly Circus
  "940GZZLUCHX", // Charing Cross
  "940GZZLUEMB", // Embankment
  "940GZZLUWLO", // Waterloo
  "940GZZLULBN", // Lambeth North
  "940GZZLUEAC", // Elephant & Castle
] as const

export const STATIC_LINE_SPINES: Record<string, StaticLineSpine> = {
  bakerloo: {
    lineId: "bakerloo",
    lineName: "Bakerloo",
    naptanIds: BAKERLOO_OUTBOUND_SPINE,
  },
}

export const getStaticLineSpine = (lineId: string): StaticLineSpine | null =>
  STATIC_LINE_SPINES[lineId.toLowerCase()] ?? null
