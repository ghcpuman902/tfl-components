import type { RealtimePrediction } from "tfl-ts"
import { BusArrivalsBoard } from "@/components/tfl/arrivals/bus-arrivals-board"
import { RailArrivalsBoard } from "@/components/tfl/arrivals/rail-arrivals-board"
import type { ArrivalsBoardChromeProps } from "@/components/tfl/arrivals/arrivals-board-view"
import type { RailArrivalsLine } from "@/lib/tfl/arrivals-prepare"

/**
 * @deprecated Prefer `RailArrivalsBoard` or `BusArrivalsBoard`.
 * Kept so existing `arrivals-board` installs keep compiling.
 */
export type ArrivalRow = RealtimePrediction & {
  /** When true, use route-number chip styling instead of tube line colours. */
  busStyle?: boolean
}

/**
 * @deprecated Use `RailArrivalsBoard` or `BusArrivalsBoard`.
 */
export type ArrivalsBoardVariant = "rail" | "bus"

/**
 * @deprecated Use `RailArrivalsLine` with `RailArrivalsBoard`.
 */
export type ArrivalsBoardLine = RailArrivalsLine

/**
 * @deprecated Use `RailArrivalsBoard` or `BusArrivalsBoard`.
 */
export type ArrivalsBoardProps = ArrivalsBoardChromeProps & {
  data?: readonly RealtimePrediction[] | readonly ArrivalRow[]
  lines?: readonly ArrivalsBoardLine[]
  maxRows?: number
  variant?: ArrivalsBoardVariant
}

/**
 * @deprecated Prefer passing `RealtimePrediction[]` into `RailArrivalsBoard`
 * or `BusArrivalsBoard`.
 */
export const toArrivalRows = (
  predictions: readonly RealtimePrediction[],
  options?: { busStyle?: boolean }
): ArrivalRow[] =>
  predictions.map((prediction) => ({
    ...prediction,
    busStyle: options?.busStyle,
  }))

/**
 * @deprecated Use `RailArrivalsBoard` or `BusArrivalsBoard`. This adapter
 * exists so older `arrivals-board` installs keep compiling. Domain grouping
 * and ordering live on those two boards, not here.
 */
export const ArrivalsBoard = ({
  variant = "rail",
  data,
  lines,
  maxRows,
  ...chrome
}: ArrivalsBoardProps) => {
  if (variant === "bus") {
    return <BusArrivalsBoard data={data} maxRows={maxRows} {...chrome} />
  }

  return (
    <RailArrivalsBoard
      data={data}
      lines={lines}
      maxRows={maxRows}
      {...chrome}
    />
  )
}

export {
  ArrivalsBoardSkeleton,
  ArrivalsBoardView,
} from "@/components/tfl/arrivals/arrivals-board-view"
export { RailArrivalsBoard } from "@/components/tfl/arrivals/rail-arrivals-board"
export { BusArrivalsBoard } from "@/components/tfl/arrivals/bus-arrivals-board"
