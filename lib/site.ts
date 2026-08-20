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

/**
 * Site-wide meta description — plain-text form of the homepage hero.
 * Keep in sync with the intro copy in `app/page.tsx`.
 */
export const SITE_DESCRIPTION =
  "Create a live station display. Configure one for a station, explore TfL data, or use the React components in your own project."
