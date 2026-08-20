/**
 * Compact stop → arrivals StopPoint ids for the hosted Board.
 *
 * A physical station can have several StopPoints. Polling the Underground
 * id at Liverpool Street never returns Elizabeth line predictions; this
 * index lists every sibling that actually carries arrivals.
 *
 * Built on the server from tfl-ts `STATION_HUBS`. Only multi-id stops are
 * stored — a missing key means "fetch this id as-is".
 */

import {
  LINE_STATION_SEQUENCES,
  STATION_HUBS,
  resolveArrivalsStopIds,
} from "tfl-ts"

/** Lines TfL's Arrivals API actually predicts. National Rail operators in a hub are topology only. */
const TFL_ARRIVALS_LINE_IDS = new Set(Object.keys(LINE_STATION_SEQUENCES))

export type BoardArrivalsStopIdsIndex = Readonly<
  Record<string, readonly string[]>
>

export const buildBoardArrivalsStopIdsIndex = (): BoardArrivalsStopIdsIndex => {
  const index: Record<string, readonly string[]> = {}

  for (const [id, hub] of Object.entries(STATION_HUBS)) {
    const tflLineIds = Object.keys(hub.lineMemberIds).filter((lineId) =>
      TFL_ARRIVALS_LINE_IDS.has(lineId)
    )
    const ids =
      tflLineIds.length > 0 ? resolveArrivalsStopIds(hub, tflLineIds) : [id]
    if (ids.length === 1 && ids[0] === id) continue
    if (ids.length === 0) continue
    index[id] = ids
  }

  return index
}

let indexMemo: BoardArrivalsStopIdsIndex | undefined

export const getBoardArrivalsStopIdsIndex = (): BoardArrivalsStopIdsIndex => {
  indexMemo ??= buildBoardArrivalsStopIdsIndex()
  return indexMemo
}

/** StopPoint ids to poll for this board stop. Always at least the input id. */
export const lookupBoardArrivalsStopIds = (
  index: BoardArrivalsStopIdsIndex,
  stopId: string | undefined
): string[] => {
  const id = stopId?.trim()
  if (!id) return []
  const mapped = index[id]
  if (mapped?.length) return [...mapped]
  return [id]
}
