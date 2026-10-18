/** Canonical production origin. */
export const SITE_URL = "https://tfl.manglekuo.com"

/** Public shadcn registry base (`…/r/<name>.json`). */
export const REGISTRY_BASE = `${SITE_URL}/r`

export const SITE_NAME = "tfl-components"

/** Hosted product name used in the document title and social cards. */
export const BOARD_SITE_NAME = "Board"

/**
 * Homepage `<title>`. Absolute, so {@link SITE_TITLE_TEMPLATE} does not
 * suffix it again.
 */
export const BOARD_HOME_TITLE =
  "Board · live London Tube & bus departures for any screen"

/** Homepage meta description. One concise match for {@link BOARD_HOME_TITLE}. */
export const BOARD_HOME_DESCRIPTION =
  "Live Tube, rail, and bus departures for a stop you choose. Leave the board on an iPad or a spare screen."

/** Other pages resolve as `Get started · Board`. */
export const SITE_TITLE_TEMPLATE = "%s · Board"

export const SITE_AUTHOR = {
  name: "MangleKuo",
  url: "https://manglekuo.com",
} as const

export const SITE_INDEPENDENCE =
  "TfL Components is an independent project and is not affiliated with or endorsed by Transport for London."

/**
 * Homepage hero line of the control variant (`HERO_VARIANTS.a`). The hero is
 * an A/B test, so this is the canonical wording for metadata and cards;
 * `hero-variants.test.ts` fails if it drifts from variant a.
 */
export const SITE_TAGLINE = "Know when to leave. Without picking up your phone."

/**
 * Catalogue and agent description. Leads with the homepage hero line, then
 * what Board shows and the developer path. The homepage document description
 * is {@link BOARD_HOME_DESCRIPTION}.
 */
export const SITE_DESCRIPTION = `${SITE_TAGLINE} Live London buses, trains and Tube status on a spare screen, in a browser. Plus React components and a typed tfl-ts client.`
