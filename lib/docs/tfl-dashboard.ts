/**
 * Copy and anchors for `/docs/tfl-dashboard`, the landing page for “build a
 * TfL dashboard”. It replaces `/docs/ipad-dashboard` and `/docs/tv` (both
 * 301 here). Kept out of the page module so unit tests can import it.
 */

export const TFL_DASHBOARD_PATH = "/docs/tfl-dashboard"

export const TFL_DASHBOARD_TITLE = "Build a TfL dashboard"

/** Visible one-sentence intro under the h1. */
export const TFL_DASHBOARD_DEK =
  "Use Board as a live Tube, Elizabeth line, DLR and bus departure board on an iPad or TV. No app and no API key. Or build your own dashboard with tfl-ts and React components."

/** Section ids. Old iPad / TV URLs redirect to `#ipad` and `#tv`. */
export const TFL_DASHBOARD_SECTION_IDS = {
  useBoard: "use-board",
  buildYourOwn: "build-your-own",
  ipad: "ipad",
  tv: "tv",
  homeAssistant: "home-assistant",
  homeview: "homeview",
  url: "url",
  build: "build",
  notReady: "not-ready",
  compare: "compare",
  faq: "faq",
} as const

export type TflDashboardPath = {
  id: string
  title: string
  body: string
  cta: { href: string; label: string }
}

/** The two first-fold paths. Both CTAs must be visible at 390×844. */
export const TFL_DASHBOARD_PATHS = [
  {
    id: TFL_DASHBOARD_SECTION_IDS.useBoard,
    title: "Use Board",
    body: "Board is a free hosted web page. Choose a station or stop, then leave the display on a screen you already own. No account and no personal TfL API key.",
    cta: { href: "/board", label: "Open the Board builder" },
  },
  {
    id: TFL_DASHBOARD_SECTION_IDS.buildYourOwn,
    title: "Build your own",
    body: "For a custom React app, install tfl-ts and a board component from this site. You will need a free key from the TfL API portal. Choose this path when you want your own layout, your own backend, or a Home Assistant card that is not just an embedded Board URL.",
    cta: { href: "/docs", label: "Get started" },
  },
] as const satisfies readonly TflDashboardPath[]
