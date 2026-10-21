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
  owner?: string
}

const item = (
  id: string,
  lineId: string,
  heading: string,
  destination: string,
  times: readonly number[],
  owner?: string
): GlanceAnchorItem => ({ id, lineId, heading, destination, times, owner })

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
  "Ealing Broadway via Acton Town",
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

/** One anchor (the user's commute) plus four quarter tiles. */
export const ANCHOR_ITEMS: readonly GlanceAnchorItem[] = [
  VIC_NB,
  VIC_SB,
  CEN_EB,
  CEN_WB,
  BAK_SB,
]

/** Two equally important named commutes plus four tiles. */
export const HOUSEHOLD_ITEMS: readonly GlanceAnchorItem[] = [
  { ...VIC_SB, owner: "Mum" },
  { ...CEN_EB, owner: "Dad" },
  VIC_NB,
  CEN_WB,
  BAK_SB,
  BAK_NB,
]
