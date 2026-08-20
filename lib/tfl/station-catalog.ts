import {
  LINE_STATION_SEQUENCES,
  STATION_HUBS,
  type StationHubInfo,
} from "tfl-ts"
import { formatStationName } from "@/lib/tfl/diagram-station"
import { stationLabelKey } from "@/lib/tfl/station-index"

export const STATION_CATALOG_MODES = [
  { id: "tube", label: "Tube" },
  { id: "elizabeth-line", label: "Elizabeth line" },
  { id: "dlr", label: "DLR" },
  { id: "overground", label: "Overground" },
  { id: "tram", label: "Tram" },
] as const

export type StationCatalogModeId = (typeof STATION_CATALOG_MODES)[number]["id"]

export type CatalogStation = {
  id: string
  /** Additional Naptan / hub IDs that refer to the same stop. */
  aliasIds: string[]
  name: string
  displayName: string
  modes: StationCatalogModeId[]
  lines: string[]
}

const CATALOG_MODE_IDS = new Set<string>(
  STATION_CATALOG_MODES.map((mode) => mode.id)
)

const CATALOG_LINE_IDS = new Set(Object.keys(LINE_STATION_SEQUENCES))

type HubAccumulator = {
  hub: StationHubInfo | undefined
  primaryId: string
  primaryName: string
  aliasIds: Set<string>
  lineIds: Set<string>
  modeIds: Set<StationCatalogModeId>
}

const hubKeyOf = (stationId: string, hub: StationHubInfo | undefined): string =>
  hub?.hubId ?? stationId

const toCatalogStation = (group: HubAccumulator): CatalogStation => {
  const aliasIds = [...group.aliasIds]
    .filter((id) => id !== group.primaryId)
    .sort()
  return {
    id: group.primaryId,
    aliasIds,
    name: group.primaryName,
    displayName: formatStationName(group.primaryName),
    modes: [...group.modeIds].sort() as StationCatalogModeId[],
    lines: [...group.lineIds].sort(),
  }
}

/**
 * Deduplicated A–Z station catalogue for Tube, Elizabeth line, DLR,
 * Overground, and Tram. Membership comes from tfl-ts `STATION_HUBS`
 * (interchange graph) plus `LINE_STATION_SEQUENCES` (serving lines).
 */
export const buildStationCatalog = (): CatalogStation[] => {
  const groups = new Map<string, HubAccumulator>()

  for (const sequence of Object.values(LINE_STATION_SEQUENCES)) {
    if (!CATALOG_MODE_IDS.has(sequence.modeName)) continue
    const modeId = sequence.modeName as StationCatalogModeId

    for (const stop of sequence.stations) {
      const rawName = stop.name.trim()
      if (!rawName) continue
      const id = stop.id.trim() || rawName
      const hub = STATION_HUBS[id]
      const key = hubKeyOf(id, hub)
      const existing = groups.get(key)

      if (!existing) {
        const aliasIds = new Set<string>()
        if (hub?.hubId && hub.hubId !== id) aliasIds.add(hub.hubId)
        groups.set(key, {
          hub,
          primaryId: id,
          primaryName: rawName,
          aliasIds,
          lineIds: new Set([sequence.lineId]),
          modeIds: new Set([modeId]),
        })
        continue
      }

      if (id !== existing.primaryId) existing.aliasIds.add(id)
      existing.lineIds.add(sequence.lineId)
      existing.modeIds.add(modeId)
    }
  }

  for (const group of groups.values()) {
    if (!group.hub) continue
    for (const lineId of Object.keys(group.hub.lineMemberIds)) {
      if (CATALOG_LINE_IDS.has(lineId)) group.lineIds.add(lineId)
    }
  }

  const stations = [...groups.values()].map(toCatalogStation)

  return stations.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "en-GB", {
      sensitivity: "base",
    })
  )
}

let catalogMemo: CatalogStation[] | undefined

/** Same as {@link buildStationCatalog}, memoised for the process lifetime. */
export const getStationCatalog = (): CatalogStation[] => {
  catalogMemo ??= buildStationCatalog()
  return catalogMemo
}

/** Build a display-key lookup for tests / tools. */
export const catalogDisplayKey = (name: string): string =>
  stationLabelKey(formatStationName(name))
