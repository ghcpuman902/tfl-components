import type { RealtimePrediction } from "tfl-ts"
import type { TrainRoute } from "@/lib/tfl/rail-train-tracker"

type Stop = { index: number; at: number; row: RealtimePrediction }
type Chain = { stops: Stop[]; destinationAt: number }
type Known = { id: string; destinationAt: number; seen: number }

const isAnonymous = (row: RealtimePrediction) =>
  !row.vehicleId?.trim() || row.vehicleId === "000"

/** Two rows for one train at one station (both platforms listed) are this close. */
const SAME_TRAIN_MS = 20_000
/** Destination arrival drift still treated as the same train between polls. */
const MATCH_MS = 180_000
const FORGET_MS = 120_000

/**
 * Elizabeth line, Overground, DLR and tram arrivals usually carry no
 * `vehicleId`. Each row is one stop's prediction for some train. Chaining the
 * rows into trains turns them back into the per-train input the tracker
 * expects, and matching each train's arrival at its destination across polls
 * keeps its id stable. Lines where most rows carry an id pass through as-is.
 */
export class AnonymousTrainIds {
  private readonly known = new Map<string, Known[]>()
  private nextId = 1

  constructor(
    private readonly routesFor: (lineId: string) => readonly TrainRoute[],
    private readonly canonical: (lineId: string) => (id: string) => string,
    private readonly arrivalTime: (
      row: RealtimePrediction,
      receivedAt: number
    ) => number
  ) {}

  assign(
    predictions: readonly RealtimePrediction[],
    receivedAt: number
  ): RealtimePrediction[] {
    const byLine = new Map<string, RealtimePrediction[]>()
    for (const row of predictions) {
      if (!row.lineId) continue
      const rows = byLine.get(row.lineId) ?? []
      rows.push(row)
      byLine.set(row.lineId, rows)
    }
    const output: RealtimePrediction[] = []
    for (const [lineId, rows] of byLine) {
      const anonymous = rows.filter(isAnonymous)
      if (anonymous.length * 2 <= rows.length) {
        output.push(...rows)
        continue
      }
      output.push(...rows.filter((row) => !isAnonymous(row)))
      const canon = this.canonical(lineId)
      const byDestination = new Map<string, RealtimePrediction[]>()
      for (const row of anonymous) {
        const key = row.destinationNaptanId
          ? canon(row.destinationNaptanId)
          : (row.destinationName ?? "")
        const group = byDestination.get(key) ?? []
        group.push(row)
        byDestination.set(key, group)
      }
      for (const [destination, group] of byDestination) {
        const chains = this.chain(lineId, destination, group, receivedAt)
        for (const { id, chain } of this.match(
          `${lineId}|${destination}`,
          chains,
          receivedAt
        )) {
          for (const stop of chain.stops)
            output.push({ ...stop.row, vehicleId: id })
        }
      }
    }
    for (const [key, list] of this.known) {
      const kept = list.filter((known) => receivedAt - known.seen <= FORGET_MS)
      if (kept.length) this.known.set(key, kept)
      else this.known.delete(key)
    }
    return output
  }

  private chain(
    lineId: string,
    destination: string,
    rows: readonly RealtimePrediction[],
    receivedAt: number
  ): Chain[] {
    const canon = this.canonical(lineId)
    let best: { route: TrainRoute; end: number; count: number } | undefined
    for (const route of this.routesFor(lineId)) {
      const ids = route.stations.map(canon)
      const terminus = ids.lastIndexOf(destination)
      const end = terminus >= 0 ? terminus : ids.length - 1
      const count = rows.filter((row) => {
        const i = ids.indexOf(canon(row.naptanId ?? ""))
        return i >= 0 && i <= end
      }).length
      // A route that terminates at the destination beats a longer one that passes it.
      const score = count + (terminus === ids.length - 1 ? 0.5 : 0)
      const bestScore = best
        ? best.count + (best.end === best.route.stations.length - 1 ? 0.5 : 0)
        : 0
      if (count > 0 && score > bestScore) best = { route, end, count }
    }
    if (!best) return []
    const { route, end } = best
    const ids = route.stations.map(canon)
    const hop = (k: number) => (route.runSeconds[k - 1] ?? 90) + 30
    const atStation = new Map<number, Stop[]>()
    for (const row of rows) {
      const index = ids.indexOf(canon(row.naptanId ?? ""))
      if (index < 0 || index > end) continue
      const stops = atStation.get(index) ?? []
      stops.push({ index, at: this.arrivalTime(row, receivedAt), row })
      atStation.set(index, stops)
    }
    const chains: Chain[] = []
    for (let k = 0; k <= end; k++) {
      const stops = (atStation.get(k) ?? []).sort((a, b) => a.at - b.at)
      const unique = stops.filter(
        (stop, i) => i === 0 || stop.at - stops[i - 1]!.at > SAME_TRAIN_MS
      )
      // Trains keep their order, so match both lists front to back.
      const open = chains
        .filter((chain) => {
          const last = chain.stops.at(-1)!
          return last.index < k && k - last.index <= 3
        })
        .sort((a, b) => a.stops.at(-1)!.at - b.stops.at(-1)!.at)
      let cursor = 0
      for (const stop of unique) {
        let matched: Chain | undefined
        while (cursor < open.length) {
          const candidate = open[cursor]!
          const last = candidate.stops.at(-1)!
          if (last.at >= stop.at) break
          cursor++
          let travel = 0
          for (let j = last.index + 1; j <= k; j++) travel += hop(j)
          if (stop.at - last.at <= travel * 2000 + 120_000) {
            matched = candidate
            break
          }
        }
        if (matched) {
          matched.stops.push(stop)
          continue
        }
        // An unmatched train is one already past the previous stop.
        const reach = k === 0 ? 30_000 : hop(k) * 1500 + 60_000
        if (stop.at - receivedAt <= reach)
          chains.push({ stops: [stop], destinationAt: 0 })
      }
    }
    for (const chain of chains) {
      const last = chain.stops.at(-1)!
      let remaining = 0
      for (let j = last.index + 1; j <= end; j++) remaining += hop(j)
      chain.destinationAt = last.at + remaining * 1000
    }
    return chains
  }

  private match(
    key: string,
    chains: readonly Chain[],
    receivedAt: number
  ): { id: string; chain: Chain }[] {
    const known = this.known.get(key) ?? []
    const pairs: { known: Known; chain: Chain; gap: number }[] = []
    for (const entry of known)
      for (const chain of chains) {
        const gap = Math.abs(entry.destinationAt - chain.destinationAt)
        if (gap <= MATCH_MS) pairs.push({ known: entry, chain, gap })
      }
    pairs.sort((a, b) => a.gap - b.gap)
    const ids = new Map<Chain, string>()
    const used = new Set<Known>()
    for (const pair of pairs) {
      if (used.has(pair.known) || ids.has(pair.chain)) continue
      used.add(pair.known)
      ids.set(pair.chain, pair.known.id)
      pair.known.destinationAt = pair.chain.destinationAt
      pair.known.seen = receivedAt
    }
    const result: { id: string; chain: Chain }[] = []
    for (const chain of chains) {
      let id = ids.get(chain)
      if (!id) {
        id = `~${this.nextId++}`
        known.push({ id, destinationAt: chain.destinationAt, seen: receivedAt })
      }
      result.push({ id, chain })
    }
    this.known.set(key, known)
    return result
  }
}
