import type { RealtimePrediction } from "tfl-ts"
import type { RailArrivalsLine } from "@/lib/tfl/arrivals-prepare"

/**
 * Deterministic arrivals fixtures for docs layout demos. Fixed
 * `timeToStation` values keep screenshots stable (countdowns format from
 * seconds — no clock involved). Bakerloo is intentionally prediction-free so
 * the seeded empty line / bound states render.
 */

const prediction = (fields: {
  id: string
  lineId: string
  lineName?: string
  modeName?: string
  platformName?: string
  towards?: string
  destinationName?: string
  timeToStation: number
}): RealtimePrediction =>
  ({
    lineName: fields.lineName ?? fields.lineId,
    destinationName: fields.destinationName ?? fields.towards,
    ...fields,
  }) as RealtimePrediction

/** Oxford Circus serving lines — Bakerloo seeds empty bound groups. */
export const OXFORD_CIRCUS_LINES: readonly RailArrivalsLine[] = [
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
]

const centralWest = (
  id: string,
  towards: string,
  timeToStation: number
): RealtimePrediction =>
  prediction({
    id,
    lineId: "central",
    lineName: "Central",
    modeName: "tube",
    platformName: "Westbound - Platform 1",
    towards,
    timeToStation,
  })

const centralEast = (
  id: string,
  towards: string,
  timeToStation: number
): RealtimePrediction =>
  prediction({
    id,
    lineId: "central",
    lineName: "Central",
    modeName: "tube",
    platformName: "Eastbound - Platform 3",
    towards,
    timeToStation,
  })

const victoriaNorth = (
  id: string,
  towards: string,
  timeToStation: number
): RealtimePrediction =>
  prediction({
    id,
    lineId: "victoria",
    lineName: "Victoria",
    modeName: "tube",
    platformName: "Northbound - Platform 4",
    towards,
    timeToStation,
  })

const victoriaSouth = (
  id: string,
  towards: string,
  timeToStation: number
): RealtimePrediction =>
  prediction({
    id,
    lineId: "victoria",
    lineName: "Victoria",
    modeName: "tube",
    platformName: "Southbound - Platform 5",
    towards,
    timeToStation,
  })

/** Oxford Circus rail arrivals — two busy bounds page past `pageSize` 3. */
export const OXFORD_CIRCUS_ARRIVALS: readonly RealtimePrediction[] = [
  centralWest("c-w-1", "Ealing Broadway", 45),
  centralWest("c-w-2", "West Ruislip", 150),
  centralWest("c-w-3", "Ealing Broadway", 260),
  centralWest("c-w-4", "Northolt", 390),
  centralEast("c-e-1", "Hainault via Newbury Park", 100),
  centralEast("c-e-2", "Loughton", 220),
  centralEast("c-e-3", "Epping", 340),
  victoriaNorth("v-n-1", "Walthamstow Central", 60),
  victoriaNorth("v-n-2", "Walthamstow Central", 180),
  victoriaNorth("v-n-3", "Seven Sisters", 300),
  victoriaSouth("v-s-1", "Brixton", 30),
  victoriaSouth("v-s-2", "Brixton", 140),
  victoriaSouth("v-s-3", "Brixton", 250),
  victoriaSouth("v-s-4", "Brixton", 370),
  victoriaSouth("v-s-5", "Stockwell", 480),
]

const bus = (
  id: string,
  route: string,
  towards: string,
  timeToStation: number
): RealtimePrediction =>
  prediction({
    id,
    lineId: route,
    lineName: route,
    modeName: "bus",
    platformName: "G",
    towards,
    timeToStation,
  })

/**
 * Trafalgar Square (stop G) — four interleaved routes. Route 9 has four buses
 * so the grouped board pages it; the flat board interleaves every route.
 */
export const TRAFALGAR_SQUARE_ARRIVALS: readonly RealtimePrediction[] = [
  bus("r9-1", "9", "Hammersmith Bus Station", 50),
  bus("r18-1", "18", "Euston Station", 110),
  bus("r205-1", "205", "Bow Church", 170),
  bus("r24-1", "24", "Hampstead Heath", 230),
  bus("r9-2", "9", "Hammersmith Bus Station", 290),
  bus("r18-2", "18", "Euston Station", 350),
  bus("r205-2", "205", "Bow Church", 410),
  bus("r24-2", "24", "Pimlico, Grosvenor Road", 470),
  bus("r9-3", "9", "Hammersmith Bus Station", 530),
  bus("r18-3", "18", "Sudbury, Harrow Road", 590),
  bus("r9-4", "9", "Hammersmith Bus Station", 650),
]

/**
 * Capworth Street (stop CV) — real shape captured from
 * `client.stopPoint.getArrivals` while a `client.stopPoint.getDisruption`
 * closure was active for this exact stop (atcoCode `490011388S`). TfL still
 * serves live predictions for both routes despite the stop being closed —
 * see the paired `CAPWORTH_STREET_DISRUPTION` fixture below.
 */
export const CAPWORTH_STREET_ARRIVALS: readonly RealtimePrediction[] = [
  bus("cv-158-1", "158", "Stratford Or Forest Gate", 268),
  bus("cv-58-1", "58", "Stratford Or Forest Gate", 649),
  bus("cv-158-2", "158", "Stratford Or Forest Gate", 973),
  bus("cv-58-2", "58", "Stratford Or Forest Gate", 1597),
  bus("cv-158-3", "158", "Stratford Or Forest Gate", 1708),
]

/**
 * Raw `stopPoint.getDisruption` shape for the Capworth Street closure above —
 * stop-wide (no route named), so `prepareBusStopDisruptions` fans it out to
 * every route in the arrivals above. TfL escapes newlines in this field as
 * a literal `\n` (backslash + "n"), not a real line break — kept as-is here
 * since that quirk is exactly what `prepareBusStopDisruptions` cleans up.
 */
export const CAPWORTH_STREET_DISRUPTION = {
  description: "Bus Stop Closed\\nuntil 17:00 Tuesday 18 August\\n\\n",
}

/** Liverpool Street serving lines used to demo a shared-track merge. */
export const LIVERPOOL_STREET_LINES: readonly RailArrivalsLine[] = [
  {
    lineId: "central",
    lineName: "Central",
    modeName: "tube",
    bounds: ["westbound", "eastbound"],
  },
  {
    lineId: "circle",
    lineName: "Circle",
    modeName: "tube",
  },
  {
    lineId: "hammersmith-city",
    lineName: "Hammersmith & City",
    modeName: "tube",
  },
  {
    lineId: "metropolitan",
    lineName: "Metropolitan",
    modeName: "tube",
  },
]

export const LIVERPOOL_STREET_LINE_GROUPS = [
  { lines: ["circle", "hammersmith-city", "metropolitan"] },
] as const

const lstCentralWest = (
  id: string,
  towards: string,
  timeToStation: number,
): RealtimePrediction =>
  prediction({
    id,
    lineId: "central",
    lineName: "Central",
    modeName: "tube",
    platformName: "Westbound - Platform 5",
    towards,
    timeToStation,
  })

const lstCentralEast = (
  id: string,
  towards: string,
  timeToStation: number,
): RealtimePrediction =>
  prediction({
    id,
    lineId: "central",
    lineName: "Central",
    modeName: "tube",
    platformName: "Eastbound - Platform 4",
    towards,
    timeToStation,
  })

const lstSubsurface = (
  id: string,
  lineId: string,
  lineName: string,
  platformName: string,
  towards: string,
  timeToStation: number,
): RealtimePrediction =>
  prediction({
    id,
    lineId,
    lineName,
    modeName: "tube",
    platformName,
    towards,
    timeToStation,
  })

/**
 * Liverpool Street — Central stays its own section; Circle / H&C / Met merge
 * and paint a per-row line chip. One westbound row is dual-listed so the
 * stacked codes chip shows.
 */
export const LIVERPOOL_STREET_ARRIVALS: readonly RealtimePrediction[] = [
  lstCentralWest("lst-c-w-1", "Ealing Broadway", 50),
  lstCentralWest("lst-c-w-2", "West Ruislip", 180),
  lstCentralEast("lst-c-e-1", "Hainault via Newbury Park", 90),
  lstCentralEast("lst-c-e-2", "Epping", 240),
  lstSubsurface(
    "lst-hc-w-1",
    "hammersmith-city",
    "Hammersmith & City",
    "Westbound - Platform 2",
    "Hammersmith",
    40,
  ),
  {
    ...lstSubsurface(
      "lst-hc-met-w-1",
      "hammersmith-city",
      "Hammersmith & City",
      "Westbound - Platform 2",
      "Check Front of Train",
      130,
    ),
    sharedTrackIdentity: {
      confidence: "ambiguous",
      rawLineId: "hammersmith-city",
      rawLineIds: ["hammersmith-city", "metropolitan"],
    },
  } as RealtimePrediction,
  lstSubsurface(
    "lst-cir-w-1",
    "circle",
    "Circle",
    "Westbound - Platform 2",
    "Hammersmith",
    220,
  ),
  lstSubsurface(
    "lst-met-e-1",
    "metropolitan",
    "Metropolitan",
    "Eastbound - Platform 1",
    "Aldgate",
    70,
  ),
  lstSubsurface(
    "lst-cir-e-1",
    "circle",
    "Circle",
    "Eastbound - Platform 1",
    "Edgware Road (Circle)",
    160,
  ),
  lstSubsurface(
    "lst-hc-e-1",
    "hammersmith-city",
    "Hammersmith & City",
    "Eastbound - Platform 1",
    "Barking",
    250,
  ),
]
