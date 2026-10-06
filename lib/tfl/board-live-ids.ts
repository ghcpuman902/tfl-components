/**
 * Shape check for hosted Board live fetches.
 * Keeps the server action from proxying arbitrary paths while still serving
 * any stop the Board builder can address (rail, bus, river, cycle).
 */

const BOARD_STOP_ID = /^[A-Za-z0-9]{6,24}$/
const BOARD_BIKE_POINT_ID = /^BikePoints_[0-9]{1,6}$/

/** Upper bound for one Board cycle panel. Extra ids are dropped before TfL. */
export const BOARD_LIVE_DOCK_LIMIT = 12

export const isBoardStopId = (stopPointId: string): boolean =>
  BOARD_STOP_ID.test(stopPointId.trim())

export const isBoardBikePointId = (bikePointId: string): boolean =>
  BOARD_BIKE_POINT_ID.test(bikePointId.trim())
