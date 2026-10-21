/**
 * Static Oxford Circus snapshot for the anchor mock. Platforms follow the live
 * board (Central 1/2, Victoria 5/6); Bakerloo 3/4 is assumed. Seconds only, so
 * screenshots never depend on the clock.
 */

export type GlanceAnchorItem = {
  id: string
  lineId: string
  /** Full bound heading, shortened by `arrivalsHeadingLadder`. */
  heading: string
  destination: string
  /** Seconds to station: first is the hero, the rest are the "then" line. */
  times: readonly number[]
}

const item = (
  id: string,
  lineId: string,
  heading: string,
  destination: string,
  times: readonly number[]
): GlanceAnchorItem => ({ id, lineId, heading, destination, times })

const VIC_NB = item(
  "vic-nb",
  "victoria",
  "Northbound · Platform 6",
  "Walthamstow Central",
  [130, 250, 545]
)
const VIC_SB = item(
  "vic-sb",
  "victoria",
  "Southbound · Platform 5",
  "Brixton",
  [70, 190, 310]
)
const CEN_EB = item(
  "cen-eb",
  "central",
  "Eastbound · Platform 2",
  "Epping",
  [140, 330, 600]
)
const CEN_WB = item(
  "cen-wb",
  "central",
  "Westbound · Platform 1",
  "Ealing Broadway",
  [45, 260, 390]
)
const BAK_SB = item(
  "bak-sb",
  "bakerloo",
  "Southbound · Platform 4",
  "Elephant & Castle",
  [200, 420, 660]
)
const BAK_NB = item(
  "bak-nb",
  "bakerloo",
  "Northbound · Platform 3",
  "Harrow & Wealdstone",
  [95, 380, 700]
)

const CEN_WB_RUISLIP = item(
  "cen-wb-ruislip",
  "central",
  "Westbound · Platform 1",
  "West Ruislip",
  [170, 480, 790]
)

/** Board priority order: the first is the anchor unless a tap pins another. */
export const ANCHOR_ITEMS: readonly GlanceAnchorItem[] = [
  VIC_NB,
  VIC_SB,
  CEN_EB,
  CEN_WB,
  BAK_SB,
]

/** Two equally important anchors plus four tiles. */
export const PAIR_ITEMS: readonly GlanceAnchorItem[] = [
  VIC_SB,
  CEN_EB,
  VIC_NB,
  CEN_WB,
  BAK_SB,
  BAK_NB,
]

/**
 * Every Oxford Circus line + direction (Central westbound split by branch, as
 * the platform board does): one anchor, six tiles for four slots.
 */
export const OVERFLOW_ITEMS: readonly GlanceAnchorItem[] = [
  VIC_NB,
  VIC_SB,
  CEN_EB,
  CEN_WB,
  BAK_SB,
  BAK_NB,
  CEN_WB_RUISLIP,
]
