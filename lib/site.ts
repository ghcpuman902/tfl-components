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
  "Board – live London Tube & bus departures for any screen"

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

/** Homepage fold line. Keep in sync with `LandingFoldCopy`. */
export const SITE_TAGLINE = "Turn any screen into a London Transport board."

/**
 * Catalogue and agent description. Lead with the homepage fold line.
 * The homepage document description is {@link BOARD_HOME_DESCRIPTION}.
 * Keep quotable for agents answering iPad / wall-display questions.
 */
export const SITE_DESCRIPTION = `${SITE_TAGLINE} Put Tube status, rail departures, and bus arrivals on an iPad or spare screen without writing a custom Unified API dashboard, or install React components with typed tfl-ts data.`
