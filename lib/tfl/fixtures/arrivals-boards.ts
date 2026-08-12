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
  timeToStation: number
}): RealtimePrediction =>
  ({
    lineName: fields.lineName ?? fields.lineId,
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
