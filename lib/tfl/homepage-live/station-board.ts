import type { RealtimePrediction } from "tfl-ts"
import {
  trainKeyOf,
  type LiveTrain,
} from "@/lib/tfl/homepage-live/engine"
import { stationHubCanonical } from "@/lib/tfl/vehicle-hop-graph"

export type BoardEntry = {
  /** `line|vehicleId`: the same key the map draws the train under. */
  key: string
  lineId: string
  destination: string
  etaSec: number
  /** How the map shows this train: exact, Beta, or not at all. */
  link: "placed" | "beta" | "none"
}

export type BoardColumn = {
  label: string
  entries: BoardEntry[]
}

export type BoardSection = {
  id: string
  lineIds: string[]
  columns: BoardColumn[]
}

export const BOARD_ROWS_PER_COLUMN = 3
/** Rows already past their ETA by more than this have left. */
const LEFT_AFTER_S = 20
const SUBSURFACE_ORDER = ["circle", "hammersmith-city", "metropolitan"]
const SUBSURFACE = new Set(SUBSURFACE_ORDER)

const STATION_SUFFIX = / (Underground|Rail|DLR|Tram) (Station|Stop)$/i

export const tidyDestination = (row: RealtimePrediction): string => {
  const name = (row.destinationName ?? "").replace(STATION_SUFFIX, "").trim()
  if (name && !/^check front of train$/i.test(name)) return name
  const towards = row.towards?.trim()
  return towards || name || "Check front of train"
}

const columnLabel = (platform: string | undefined, direction?: string) => {
  const text = (platform ?? "").replace(/\s+-\s+/, " · ").trim()
  if (text) return text
  return direction ? direction[0]!.toUpperCase() + direction.slice(1) : "Platform"
}

const sectionId = (lineId: string) => (SUBSURFACE.has(lineId) ? "subsurface" : lineId)

/**
 * The Board for one station, from the same poll the map draws. Each entry
 * carries the train's key so a row and its train can find each other.
 */
export const buildStationBoard = ({
  rows,
  trains,
  stopIds,
  receivedAt,
  lineOrder = [],
}: {
  rows: readonly RealtimePrediction[]
  trains: readonly LiveTrain[]
  stopIds: readonly string[]
  receivedAt: number
  lineOrder?: readonly string[]
}): BoardSection[] => {
  const here = new Set(stopIds.map(stationHubCanonical))
  const byKey = new Map(trains.map((train) => [train.key, train]))
  const sections = new Map<string, Map<string, BoardEntry[]>>()
  const seen = new Set<string>()
  const ordered = rows
    .filter((row) => row.lineId && row.naptanId && here.has(stationHubCanonical(row.naptanId)))
    .map((row) => ({ row, eta: Date.parse(row.expectedArrival ?? "") }))
    .filter(({ eta }) => Number.isFinite(eta) && (eta - receivedAt) / 1000 >= -LEFT_AFTER_S)
    .sort((a, b) => a.eta - b.eta)
  for (const { row, eta } of ordered) {
    const lineId = row.lineId!
    const label = columnLabel(row.platformName, row.direction)
    const columns = sections.get(sectionId(lineId)) ?? new Map<string, BoardEntry[]>()
    const entries = columns.get(label) ?? []
    const key = row.vehicleId ? trainKeyOf(lineId, row.vehicleId) : `${lineId}|${label}|${eta}`
    const dedupe = `${label}|${key}`
    if (entries.length >= BOARD_ROWS_PER_COLUMN || seen.has(dedupe)) continue
    seen.add(dedupe)
    const train = byKey.get(key)
    entries.push({
      key,
      lineId,
      destination: tidyDestination(row),
      etaSec: Math.max(0, Math.round((eta - receivedAt) / 1000)),
      link: train && train.status !== "hidden" ? train.status : "none",
    })
    columns.set(label, entries)
    sections.set(sectionId(lineId), columns)
  }
  const rank = (lineIds: string[]) => {
    const i = Math.min(...lineIds.map((id) => lineOrder.indexOf(id) >>> 0))
    return i
  }
  return [...sections.entries()]
    .map(([id, columns]) => {
      const cols = [...columns.entries()]
        .map(([label, entries]) => ({ label, entries }))
        .sort((a, b) => a.label.localeCompare(b.label, "en-GB", { numeric: true }))
      const lineIds = [
        ...new Set(cols.flatMap((c) => c.entries.map((e) => e.lineId))),
      ].sort((a, b) => SUBSURFACE_ORDER.indexOf(a) - SUBSURFACE_ORDER.indexOf(b) || a.localeCompare(b))
      return { id, lineIds, columns: cols }
    })
    .sort((a, b) => rank(a.lineIds) - rank(b.lineIds) || a.id.localeCompare(b.id))
}

/** Trains to draw around a station: those due within `windowSec`, and those that left in the last two minutes. */
export const trainsAroundStation = ({
  rows,
  trains,
  stopIds,
  receivedAt,
  windowSec = 600,
}: {
  rows: readonly RealtimePrediction[]
  trains: readonly LiveTrain[]
  stopIds: readonly string[]
  receivedAt: number
  windowSec?: number
}): LiveTrain[] => {
  const here = new Set(stopIds.map(stationHubCanonical))
  const near = new Set<string>()
  for (const row of rows) {
    if (!row.lineId || !row.vehicleId || !row.naptanId) continue
    if (!here.has(stationHubCanonical(row.naptanId))) continue
    const seconds = (Date.parse(row.expectedArrival ?? "") - receivedAt) / 1000
    if (seconds <= windowSec && seconds >= -120)
      near.add(trainKeyOf(row.lineId, row.vehicleId))
  }
  return trains.filter(
    (train) => train.status !== "hidden" && near.has(train.key)
  )
}
