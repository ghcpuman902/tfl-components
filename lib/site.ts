/** Canonical production origin. */
export const SITE_URL = "https://tfl.manglekuo.com"

/** Public shadcn registry base (`…/r/<name>.json`). */
export const REGISTRY_BASE = `${SITE_URL}/r`

export const SITE_NAME = "tfl-components"

export const SITE_AUTHOR = {
  name: "MangleKuo",
  url: "https://manglekuo.com",
} as const

export const SITE_INDEPENDENCE =
  "TfL Components is an independent project and is not affiliated with or endorsed by Transport for London."

/** Homepage fold line. Keep in sync with `LandingFoldCopy`. */
export const SITE_TAGLINE =
  "Turn any screen into a London Transport board."

/**
 * Site-wide meta description. Lead with the homepage fold line.
 */
export const SITE_DESCRIPTION = `${SITE_TAGLINE} Configure a live display for a stop you choose, or install the React components in your own project.`
