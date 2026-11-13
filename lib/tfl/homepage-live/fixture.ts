import { readFileSync } from "node:fs"
import path from "node:path"
import { brotliDecompressSync } from "node:zlib"
import type { RealtimePrediction } from "tfl-ts"

type TrimmedRow = Record<string, unknown> & { read?: string }

type Round = { receivedAt: number; rows: Record<string, TrimmedRow[]> }

type Fixture = {
  recordedAt: string
  arrivals: Round[]
  stopArrivals: Round[]
  busArrivals: Round[]
}

export type ReplayRound = {
  index: number
  receivedAt: number
  /** Rows of every line in this round, as `/Line/{ids}/Arrivals` returns them. */
  rows: RealtimePrediction[]
  byLine: ReadonlyMap<string, RealtimePrediction[]>
}

export const REPLAY_FIXTURE_FILE = path.join(
  process.cwd(),
  "lib/tfl/fixtures/homepage-live/rounds.json.br"
)

let cached: Fixture | undefined
const load = (): Fixture => {
  cached ??= JSON.parse(
    brotliDecompressSync(readFileSync(REPLAY_FIXTURE_FILE)).toString("utf8")
  ) as Fixture
  return cached
}

const toPrediction = (row: TrimmedRow): RealtimePrediction => {
  const { read, ...rest } = row
  return (read
    ? { ...rest, timing: { read } }
    : rest) as unknown as RealtimePrediction
}

const toRound = (round: Round, index: number): ReplayRound => {
  const byLine = new Map<string, RealtimePrediction[]>()
  const rows: RealtimePrediction[] = []
  for (const [key, list] of Object.entries(round.rows)) {
    const predictions = list.map(toPrediction)
    byLine.set(key, predictions)
    rows.push(...predictions)
  }
  return { index, receivedAt: round.receivedAt, rows, byLine }
}

export const replayRoundCount = () => load().arrivals.length

/** Every line's arrivals for the n-th 30 s round of the 13 Nov 2026 recording. */
export const replayArrivalsRound = (index: number): ReplayRound => {
  const round = load().arrivals[index]
  if (!round) throw new Error(`No replay round ${index}`)
  return toRound(round, index)
}

export const replayStopArrivalsRound = (index: number): ReplayRound =>
  toRound(load().stopArrivals[index]!, index)

export const replayBusArrivalsRound = (index: number): ReplayRound =>
  toRound(load().busArrivals[index]!, index)
