/** Tube / rail station for the homepage / docs departures board. */
export const HOME_RAIL_STOP = {
  id: "940GZZLUOXC",
  name: "Oxford Circus",
} as const

/** Lines that serve {@link HOME_RAIL_STOP} — keeps empty sections stable on the board. */
export const HOME_RAIL_LINES = [
  {
    lineId: "bakerloo",
    lineName: "Bakerloo",
    modeName: "tube",
    bounds: ["northbound", "southbound"],
  },
  {
    lineId: "central",
    lineName: "Central",
    modeName: "tube",
    bounds: ["westbound", "eastbound"],
  },
  {
    lineId: "victoria",
    lineName: "Victoria",
    modeName: "tube",
    bounds: ["northbound", "southbound"],
  },
] as const

/**
 * Busy boardable bus stop at Trafalgar Square (NaPTAN 490…).
 * Chosen for a reliable, visually useful board without discovery UI.
 */
export const HOME_BUS_STOP = {
  id: "490000091G",
  name: "Trafalgar Square",
  stopLetter: "G",
} as const

/** Busy interchange pier served by RB1, RB4, and RB6. Poll this id, not a berth child. */
export const HOME_RIVER_STOP = {
  id: "930GCAW",
  name: "Canary Wharf Pier",
} as const
