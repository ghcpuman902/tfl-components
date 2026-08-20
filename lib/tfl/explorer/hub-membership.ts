import {
  LINE_STATION_SEQUENCES,
  STATION_HUBS,
  resolveArrivalsStopIds,
} from "tfl-ts"
import { formatStationName } from "@/lib/tfl/diagram-station"
import type { ExplorerHubMember } from "@/lib/tfl/explorer-point-normalise"

/** Lines TfL's Arrivals API actually predicts. National Rail operators are topology only. */
const TFL_ARRIVALS_LINE_IDS = new Set(Object.keys(LINE_STATION_SEQUENCES))

export type ExplorerHubMembership = {
  hubId: string
  selectedId: string
  /** True when more than one StopPoint carries TfL arrivals. */
  isHub: boolean
  members: ExplorerHubMember[]
  /** TfL-prediction line → StopPoint that has arrivals for it. */
  lineMemberIds: Readonly<Record<string, string>>
  arrivalsStopIds: string[]
}

export const getExplorerHubMembership = (
  stopId: string | undefined
): ExplorerHubMembership | null => {
  const id = stopId?.trim()
  if (!id) return null
  const hub = STATION_HUBS[id]
  if (!hub) return null

  const tflLineIds = Object.keys(hub.lineMemberIds).filter((lineId) =>
    TFL_ARRIVALS_LINE_IDS.has(lineId)
  )
  const lineMemberIds: Record<string, string> = {}
  for (const lineId of tflLineIds) {
    const memberId = hub.lineMemberIds[lineId]
    if (memberId) lineMemberIds[lineId] = memberId
  }

  const arrivalsStopIds =
    tflLineIds.length > 0 ? resolveArrivalsStopIds(hub, tflLineIds) : [id]
  const pollIds = arrivalsStopIds.length > 0 ? arrivalsStopIds : [id]
  const pollSet = new Set(pollIds)

  const members: ExplorerHubMember[] = hub.members
    .filter((member) => pollSet.has(member.id))
    .map((member) => ({
      id: member.id,
      name: formatStationName(member.name),
      lineIds: member.lines.filter((lineId) =>
        TFL_ARRIVALS_LINE_IDS.has(lineId)
      ),
    }))

  return {
    hubId: hub.hubId ?? id,
    selectedId: id,
    isHub: members.length > 1,
    members,
    lineMemberIds,
    arrivalsStopIds: pollIds,
  }
}

/** StopPoint ids to poll for this Explorer point. Always at least the input id. */
export const lookupExplorerArrivalsStopIds = (
  stopId: string | undefined
): string[] => {
  const id = stopId?.trim()
  if (!id) return []
  const membership = getExplorerHubMembership(id)
  if (membership?.arrivalsStopIds.length) return [...membership.arrivalsStopIds]
  return [id]
}
