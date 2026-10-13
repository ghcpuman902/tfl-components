import type { RealtimePrediction } from "tfl-ts"
import { getStaticLineSequence } from "@/lib/tfl/line-topology"
import { AnonymousTrainIds } from "@/lib/tfl/rail-train-identity"
import { hopGraphForRailLine } from "@/lib/tfl/vehicle-hop-graph"
import {
  railPolylinesForLine,
  railStationsById,
} from "@/lib/tfl/rail-vehicle-geometry"
import {
  hopLengthKm,
  pickHopPolyline,
  positionBehindStop,
} from "@/lib/tfl/vehicle-progress"
import type { VehiclePosition } from "@/lib/tfl/map-vehicles"

export type TrainMotion = NonNullable<VehiclePosition["trainMotion"]>
export type TrainPhase = TrainMotion["phase"]
export type TrainRoute = TrainMotion["route"]
type Observation = { at: number; distance: number }
type TrainTrack = {
  motion: TrainMotion
  history: Observation[]
  signature: string
  lastReceived: number
  lastSourceAt: number
  atStation?: { id: string; since: number; last: number }
  departed?: { id: string; at: number }
  losses: [number, number]
  forecasts: { at: number; distances: [number, number] }[]
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n))
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}
const normalise = (name: string) =>
  name
    .toLowerCase()
    .replace(/underground station|rail station|station|platform\s*\d+.*$/g, "")
    .replace(/st\.?(?=\s|$)/g, "saint")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "")

/** Resolve TfL's shortened location names only when the match is unambiguous. */
export const locationStation = (
  lineId: string,
  name: string
): string | undefined => {
  const wanted = normalise(name)
  if (wanted.length < 3) return undefined
  const stations = getStaticLineSequence(lineId)?.stations ?? []
  const exact = stations.find((s) => normalise(s.name) === wanted)
  if (exact) return exact.id
  const matches = stations.filter(
    (s) =>
      normalise(s.name).startsWith(wanted) ||
      wanted.startsWith(normalise(s.name))
  )
  return matches.length === 1 ? matches[0]!.id : undefined
}

export type LocationEvidence = {
  kind: "at" | "between" | "approaching" | "departed"
  from?: string
  to: string
}
export const parseTrainLocation = (
  lineId: string,
  text: string
): LocationEvidence | undefined => {
  const between = text.match(/^Between (.+?) and (.+)$/i)
  if (between) {
    // "and" is also part of station names, so try every split.
    const rest = text.slice(8)
    for (const match of rest.matchAll(/ and /gi)) {
      const from = locationStation(lineId, rest.slice(0, match.index))
      const to = locationStation(lineId, rest.slice(match.index! + 5))
      if (from && to) return { kind: "between", from, to }
    }
    return undefined
  }
  const other = text.match(
    /^(At|Approaching|Leaving|Departed|Departing|Left) (.+)$/i
  )
  if (!other) return undefined
  const to = locationStation(lineId, other[2]!)
  if (!to) return undefined
  const kind = other[1]!.toLowerCase()
  return {
    kind: ["leaving", "departing", "left"].includes(kind)
      ? "departed"
      : (kind as LocationEvidence["kind"]),
    to,
  }
}

/** Feed time, never the time the HTTP response happened to arrive. */
export const predictionSourceTime = (
  row: RealtimePrediction,
  receivedAt: number
): number => {
  const read = Date.parse(row.timing?.read ?? "")
  const stamp = Date.parse(row.timestamp ?? "")
  const valid = [read, stamp].filter(
    (n) => Number.isFinite(n) && n > 1e12 && n <= receivedAt + 5000
  )
  return Math.min(receivedAt, valid[0] ?? receivedAt)
}
export const predictionArrivalTime = (
  row: RealtimePrediction,
  receivedAt: number
): number => {
  const expected = Date.parse(row.expectedArrival ?? "")
  return Number.isFinite(expected)
    ? expected
    : predictionSourceTime(row, receivedAt) +
        Math.max(0, row.timeToStation ?? 0) * 1000
}

let stationCoords: ReturnType<typeof railStationsById> | undefined
const getCoords = () => (stationCoords ??= railStationsById())

const routeCache = new Map<string, TrainRoute[]>()
export const trainRoutes = (lineId: string): TrainRoute[] => {
  const cached = routeCache.get(lineId)
  if (cached) return cached
  const sequence = getStaticLineSequence(lineId)
  const graph = hopGraphForRailLine(lineId)
  const coords = getCoords()
  const polylines = railPolylinesForLine(lineId)
  const routes = (sequence?.orderedRoutes ?? [])
    .filter((r) => r.serviceType === "Regular")
    .map((r, index) => {
      const stations = [...r.stationIds]
      const metres = [0]
      const runSeconds: number[] = []
      for (let i = 1; i < stations.length; i++) {
        const from = coords.get(stations[i - 1]!)
        const to = coords.get(stations[i]!)
        const hop = pickHopPolyline(
          polylines,
          stations[i - 1],
          stations[i],
          graph.canonical
        )
        const m =
          from && to
            ? hopLengthKm({
                from,
                to,
                lineId,
                polylines,
                fromStopId: stations[i - 1],
                toStopId: stations[i],
                canonical: graph.canonical,
              }) * 1000
            : 1000
        metres.push(metres[i - 1]! + Math.max(50, m))
        // Timetable intervals include the preceding platform dwell.
        runSeconds.push(
          clamp((hop?.hopMinutes ?? (m / 1000) * 1.6) * 60 - 25, 30, 300)
        )
      }
      return {
        id: `${lineId}:${index}`,
        lineId,
        direction: r.direction,
        stations,
        metres,
        runSeconds,
      }
    })
  routeCache.set(lineId, routes)
  return routes
}

export const routeDistanceIndex = (
  route: TrainRoute,
  distance: number
): number => {
  let i = 1
  while (i < route.metres.length - 1 && route.metres[i]! < distance) i++
  return i
}

const chooseRoute = (
  lineId: string,
  rows: RealtimePrediction[],
  evidence?: LocationEvidence,
  previous?: TrainRoute
): TrainRoute | undefined => {
  const graph = hopGraphForRailLine(lineId)
  const canon = graph.canonical
  const ordered = [...rows].sort(
    (a, b) =>
      predictionArrivalTime(a, Infinity) - predictionArrivalTime(b, Infinity)
  )
  let best: TrainRoute | undefined
  let bestScore = -Infinity
  for (const route of trainRoutes(lineId)) {
    const ids = route.stations.map(canon)
    const anchor = evidence ? ids.indexOf(canon(evidence.to)) : -1
    if (evidence && anchor < 0) continue
    if (evidence?.from && ids.indexOf(canon(evidence.from)) !== anchor - 1)
      continue
    let score = route.id === previous?.id ? 4 : 0
    let last = -1
    for (const row of ordered) {
      const i = ids.indexOf(canon(row.naptanId ?? ""))
      if (i < 0) {
        score -= 3
        continue
      }
      score += i >= last ? 2 : -6
      last = i
      if (row.direction && row.direction === route.direction) score += 1
      if (
        row.destinationNaptanId &&
        ids.at(-1) === canon(row.destinationNaptanId)
      )
        score += 2
    }
    if (score > bestScore) {
      best = route
      bestScore = score
    }
  }
  return best
}

/** Newest-weighted least squares; a speed trend is accepted only with enough time span. */
export const fitTrainMotion = (
  history: readonly Observation[]
): { speed: number; acceleration: number } => {
  if (history.length < 2) return { speed: 0, acceleration: 0 }
  const end = history.at(-1)!
  const samples = history.filter((o) => end.at - o.at < 180000)
  const regression = (part: readonly Observation[]) => {
    let w = 0,
      t = 0,
      x = 0,
      tt = 0,
      tx = 0
    for (const o of part) {
      const dt = (o.at - end.at) / 1000
      const weight = Math.exp(dt / 45)
      w += weight
      t += dt * weight
      x += o.distance * weight
      tt += dt * dt * weight
      tx += dt * o.distance * weight
    }
    return (w * tx - t * x) / Math.max(1e-6, w * tt - t * t)
  }
  const speed = clamp(regression(samples), 0, 30)
  const recent = samples.filter((o) => end.at - o.at <= 45000)
  const acceleration =
    samples.length >= 5 && recent.length >= 3
      ? clamp((regression(recent) - speed) / 30, -0.3, 0.3)
      : 0
  return { speed, acceleration }
}

/** Continue only through ordered downstream predictions, allowing a platform dwell first. */
const scheduledTrainMotion = (motion: TrainMotion, at: number): TrainMotion => {
  let next = motion
  for (const stop of motion.following ?? []) {
    if (at < stop.departureAt || at - motion.asOf > 90000) break
    next = {
      ...next,
      distance: next.target,
      target: stop.target,
      arrivalAt: stop.arrivalAt,
      departureAt: undefined,
      asOf: stop.departureAt,
      speed: 0,
      phase: "accelerating",
      following: motion.following?.filter(
        (s) => s.departureAt > stop.departureAt
      ),
    }
  }
  return next
}

/** Analytic speed controller, shared by replay and the display. */
export const trainDistanceAt = (motion: TrainMotion, at: number): number => {
  motion = scheduledTrainMotion(motion, at)
  const dt = clamp((at - motion.asOf) / 1000, 0, 90)
  if (motion.phase === "dwelling") {
    if (motion.departureAt == null || at <= motion.departureAt)
      return motion.distance
    return trainDistanceAt(
      { ...motion, phase: "accelerating", asOf: motion.departureAt, speed: 0 },
      at
    )
  }
  const remaining = Math.max(0, motion.target - motion.distance)
  const seconds = Math.max(1, (motion.arrivalAt - motion.asOf) / 1000)
  const required = remaining / seconds
  // Ease velocity over six seconds rather than restarting a position tween every poll.
  const desired = clamp(required, 0, 30)
  const v0 = clamp(motion.speed, 0, 30)
  const ramp = 6
  const delta = desired - v0
  const travelled = v0 * dt + delta * (dt - ramp * (1 - Math.exp(-dt / ramp)))
  return clamp(
    motion.distance + Math.max(0, travelled),
    motion.distance,
    motion.target
  )
}

export const placeTrainMotion = (
  motion: TrainMotion,
  at: number
): VehiclePosition => {
  motion = scheduledTrainMotion(motion, at)
  const route = motion.route
  const distance = trainDistanceAt(motion, at)
  const i = routeDistanceIndex(route, distance)
  const fromStopId = route.stations[i - 1]!
  const nextStopId = route.stations[i]!
  const coords = getCoords()
  const nextStop = coords.get(nextStopId)!
  const following = coords.get(route.stations[i + 1] ?? "")
  const remainingKm = Math.max(0, route.metres[i]! - distance) / 1000
  const placed = positionBehindStop({
    nextStop,
    followingStop: following,
    remainingKm,
    lineId: route.lineId,
    polylines: railPolylinesForLine(route.lineId),
    fromStopId,
    toStopId: nextStopId,
    canonical: hopGraphForRailLine(route.lineId).canonical,
  })
  return {
    vehicleId: "",
    lineId: route.lineId,
    ...placed,
    destinationName: "",
    timeToNextStationSec: Math.max(0, (motion.arrivalAt - at) / 1000),
    nextStopId,
    fromStopId,
    nextStopLat: nextStop.lat,
    nextStopLon: nextStop.lon,
    remainingKm,
    asOf: motion.asOf,
    trainMotion: { ...motion, distance, asOf: at },
  }
}

export class RailTrainTracker {
  readonly tracks = new Map<string, TrainTrack>()
  readonly runTimes = new Map<string, number[]>()
  private readonly anonymous = new AnonymousTrainIds(
    trainRoutes,
    (lineId) => hopGraphForRailLine(lineId).canonical,
    predictionArrivalTime
  )
  private hopSeconds(route: TrainRoute, i: number): number {
    const key = `${route.lineId}:${route.stations[i - 1]}>${route.stations[i]}`
    const learned = this.runTimes.get(key) ?? []
    // Five prior samples prevent a single noisy transition from taking over.
    return (
      (5 * (route.runSeconds[i - 1] ?? 90) + learned.length * median(learned)) /
      (5 + learned.length)
    )
  }
  ingest(
    predictions: readonly RealtimePrediction[],
    receivedAt: number
  ): VehiclePosition[] {
    const groups = new Map<string, RealtimePrediction[]>()
    for (const row of this.anonymous.assign(predictions, receivedAt)) {
      if (!row.vehicleId?.trim() || !row.lineId || row.vehicleId === "000")
        continue
      const key = `${row.lineId}:${row.vehicleId}`
      const group = groups.get(key) ?? []
      group.push(row)
      groups.set(key, group)
    }
    const output: VehiclePosition[] = []
    for (const [key, rows] of groups) {
      rows.sort(
        (a, b) =>
          predictionSourceTime(b, receivedAt) -
          predictionSourceTime(a, receivedAt)
      )
      const newest =
        rows.find((row) =>
          parseTrainLocation(row.lineId!, row.currentLocation ?? "")
        ) ?? rows[0]!
      const lineId = newest.lineId!
      const sourceAt = predictionSourceTime(newest, receivedAt)
      const evidence = parseTrainLocation(lineId, newest.currentLocation ?? "")
      const previous = this.tracks.get(key)
      const route = chooseRoute(lineId, rows, evidence, previous?.motion.route)
      if (!route || route.stations.length < 2 || receivedAt - sourceAt > 180000)
        continue
      const signature = `${sourceAt}:${newest.currentLocation}:${rows
        .map((r) => `${r.naptanId}:${r.expectedArrival ?? r.timeToStation}`)
        .sort()
        .join(",")}`
      if (
        previous &&
        (signature === previous.signature || sourceAt < previous.lastSourceAt)
      ) {
        previous.lastReceived = receivedAt
        output.push({
          ...placeTrainMotion(previous.motion, receivedAt),
          vehicleId: newest.vehicleId!,
          destinationName: newest.destinationName ?? "",
        })
        continue
      }
      const canon = hopGraphForRailLine(lineId).canonical
      const indices = route.stations.map(canon)
      const arrivals = new Map<number, number>()
      for (const row of rows) {
        const i = indices.indexOf(canon(row.naptanId ?? ""))
        // Rows are newest first. A second platform row may be an older prediction.
        if (i >= 0 && !arrivals.has(i))
          arrivals.set(i, predictionArrivalTime(row, receivedAt))
      }
      let i = evidence ? indices.indexOf(canon(evidence.to)) : -1
      const sameRoute = previous?.motion.route.id === route.id
      let distance: number
      let phase: TrainPhase = "running"
      let target: number
      let arrivalAt: number
      let departureAt: number | undefined
      const age = Math.max(0, (receivedAt - sourceAt) / 1000)
      if (i >= 0 && evidence) {
        const atSince =
          sameRoute && previous!.atStation?.id === evidence.to
            ? previous!.atStation.since
            : sourceAt - 10000
        if (evidence.kind === "at") {
          distance = route.metres[i]!
          phase = "dwelling"
          target = distance
          arrivalAt = sourceAt
          const nextI = Math.min(route.stations.length - 1, i + 1)
          if (nextI > i) {
            const run = this.hopSeconds(route, nextI)
            // A platform report is a position at source time. Carry its age through the residual dwell.
            departureAt = clamp(
              (arrivals.get(nextI) ?? atSince + (30 + run) * 1000) - run * 1000,
              atSince + 15000,
              atSince + 60000
            )
            if (receivedAt > departureAt) {
              i = nextI
              const seconds = Math.max(0, (receivedAt - departureAt) / 1000)
              const fraction = clamp(seconds / run, 0, 1)
              distance =
                route.metres[i - 1]! +
                (route.metres[i]! - route.metres[i - 1]!) * fraction
              target = route.metres[i]!
              arrivalAt = departureAt + run * 1000
              phase =
                fraction < 0.2
                  ? "accelerating"
                  : fraction > 0.8
                    ? "braking"
                    : "running"
            } else {
              target = route.metres[nextI]!
              arrivalAt = departureAt + run * 1000
            }
          }
        } else {
          if (evidence.kind === "departed")
            i = Math.min(route.stations.length - 1, i + 1)
          i = Math.max(1, i)
          const run = this.hopSeconds(route, i)
          let nextEta = arrivals.get(i)
          if (nextEta == null) {
            let offset = 0
            for (
              let j = i + 1;
              j < Math.min(route.stations.length, i + 4);
              j++
            ) {
              offset += (this.hopSeconds(route, j) + 30) * 1000
              const downstream = arrivals.get(j)
              if (downstream != null) {
                nextEta = downstream - offset
                break
              }
            }
          }
          const fallback =
            evidence.kind === "approaching"
              ? 12
              : evidence.kind === "departed"
                ? run
                : run * 0.5
          const secondsAtSource = nextEta
            ? (nextEta - sourceAt) / 1000
            : fallback
          const fraction = clamp(
            1 - secondsAtSource / run,
            evidence.kind === "approaching" ? 0.7 : 0,
            evidence.kind === "departed" ? 0.25 : 0.98
          )
          distance =
            route.metres[i - 1]! +
            (route.metres[i]! - route.metres[i - 1]!) * fraction
          distance = Math.min(
            route.metres[i]!,
            distance + (age * (route.metres[i]! - route.metres[i - 1]!)) / run
          )
          target = route.metres[i]!
          arrivalAt = nextEta ?? sourceAt + fallback * 1000
          phase =
            distance >= target - 150
              ? "braking"
              : evidence.kind === "departed"
                ? "accelerating"
                : "running"
        }
      } else {
        const upcoming = [...arrivals]
          .filter(([, at]) => at >= receivedAt - 5000)
          .sort((a, b) => a[1] - b[1])[0]
        if (!upcoming) continue
        i = Math.max(1, upcoming[0])
        const run = this.hopSeconds(route, i)
        target = route.metres[i]!
        arrivalAt = upcoming[1]
        distance =
          target -
          (target - route.metres[i - 1]!) *
            clamp((arrivalAt - receivedAt) / 1000 / run, 0, 1)
      }
      let history = sameRoute ? previous!.history : []
      // Keep a short observation window; delayed platform reports already include a dwell prior.
      const observation = { at: receivedAt, distance }
      history = [...history, observation].slice(-12)
      const fit = fitTrainMotion(history)
      const losses: [number, number] = sameRoute
        ? [...previous!.losses]
        : [100, 100]
      if (sameRoute) {
        for (const forecast of previous!.forecasts) {
          if (Math.abs(forecast.at - receivedAt) <= 12000) {
            for (const method of [0, 1] as const)
              losses[method] =
                losses[method] * 0.8 +
                Math.abs(forecast.distances[method] - distance) * 0.2
          }
        }
      }
      const priorSpeed =
        phase === "dwelling"
          ? 0
          : (route.metres[i]! - route.metres[Math.max(0, i - 1)]!) /
            this.hopSeconds(route, i)
      const speed =
        phase === "dwelling"
          ? 0
          : history.length >= 3
            ? clamp(
                (losses[0] < losses[1] ? 0.7 : 0.3) * fit.speed +
                  (losses[0] < losses[1] ? 0.3 : 0.7) * priorSpeed +
                  fit.acceleration * 5,
                0,
                30
              )
            : priorSpeed
      const following: NonNullable<TrainMotion["following"]> = []
      let lastArrival = arrivalAt
      for (let j = i + 1; j < Math.min(route.stations.length, i + 4); j++) {
        const eta = arrivals.get(j)
        if (eta == null || eta < lastArrival + 20000) break
        const departure = clamp(
          eta - this.hopSeconds(route, j) * 1000,
          lastArrival + 50000,
          lastArrival + 90000
        )
        if (eta <= departure) break
        following.push({
          target: route.metres[j]!,
          departureAt: departure,
          arrivalAt: eta,
        })
        lastArrival = eta
      }
      const motion: TrainMotion = {
        route,
        distance,
        speed,
        acceleration: fit.acceleration,
        target,
        arrivalAt,
        asOf: receivedAt,
        phase,
        departureAt,
        following,
      }
      const track: TrainTrack = {
        motion,
        history,
        signature,
        lastReceived: receivedAt,
        lastSourceAt: sourceAt,
        losses,
        forecasts: [
          {
            at: receivedAt + 15000,
            distances: [
              Math.min(target, distance + fit.speed * 15),
              Math.min(target, distance + priorSpeed * 15),
            ],
          },
        ],
        atStation: sameRoute ? previous!.atStation : undefined,
        departed: sameRoute ? previous!.departed : undefined,
      }
      if (evidence?.kind === "at") {
        const id = evidence.to
        if (track.departed && track.departed.id !== id) {
          const from = indices.indexOf(canon(track.departed.id))
          const arrivalIndex = indices.indexOf(canon(id))
          if (arrivalIndex === from + 1) {
            const run = (sourceAt - track.departed.at) / 1000
            if (run >= 25 && run <= 300) {
              const hopKey = `${lineId}:${route.stations[from]}>${route.stations[arrivalIndex]}`
              this.runTimes.set(
                hopKey,
                [...(this.runTimes.get(hopKey) ?? []), run].slice(-24)
              )
            }
          }
          track.departed = undefined
        }
        track.atStation =
          track.atStation?.id === id
            ? { ...track.atStation, last: sourceAt }
            : { id, since: sourceAt, last: sourceAt }
      } else if (track.atStation) {
        track.departed = {
          id: track.atStation.id,
          at: (track.atStation.last + sourceAt) / 2,
        }
        track.atStation = undefined
      }
      this.tracks.set(key, track)
      output.push({
        ...placeTrainMotion(motion, receivedAt),
        vehicleId: newest.vehicleId!,
        destinationName: newest.destinationName ?? "",
      })
    }
    // Missing vehicles coast briefly; an empty successful response cannot keep ghosts forever.
    for (const [key, track] of this.tracks) {
      if (receivedAt - track.lastReceived > 90000) {
        this.tracks.delete(key)
        continue
      }
      if (!groups.has(key))
        output.push({
          ...placeTrainMotion(track.motion, receivedAt),
          vehicleId: key.slice(key.indexOf(":") + 1),
        })
    }
    return output
  }
}

/** Display reconciliation in route metres. Carries velocity across polls and never eases in map coordinates. */
export const advanceDisplayedTrainMotion = (
  observed: TrainMotion,
  previous: TrainMotion | undefined,
  at: number
): TrainMotion => {
  observed = scheduledTrainMotion(observed, at)
  let old = previous
  if (
    old &&
    old.route.id !== observed.route.id &&
    old.route.direction === observed.route.direction
  ) {
    const i = routeDistanceIndex(old.route, old.distance)
    const canonical = hopGraphForRailLine(observed.route.lineId).canonical
    const from = canonical(old.route.stations[i - 1]!)
    const to = canonical(old.route.stations[i]!)
    const j = observed.route.stations.findIndex(
      (id, index) =>
        index > 0 &&
        canonical(id) === to &&
        canonical(observed.route.stations[index - 1]!) === from
    )
    if (j > 0) {
      const fraction =
        (old.distance - old.route.metres[i - 1]!) /
        (old.route.metres[i]! - old.route.metres[i - 1]!)
      old = {
        ...old,
        route: observed.route,
        distance:
          observed.route.metres[j - 1]! +
          fraction *
            (observed.route.metres[j]! - observed.route.metres[j - 1]!),
      }
    }
  }
  if (!old || old.route.id !== observed.route.id)
    return { ...observed, distance: trainDistanceAt(observed, at), asOf: at }
  const dt = clamp((at - old.asOf) / 1000, 0, 2)
  const truth = trainDistanceAt(observed, at)
  const error = truth - old.distance
  // Only a gross mismatch permits a reset. Ordinary negative errors stop the train until the estimate catches up.
  if (Math.abs(error) > 2500)
    return { ...observed, distance: trainDistanceAt(observed, at), asOf: at }
  const target = Math.max(old.distance, observed.target)
  const remaining = Math.max(0, target - old.distance)
  const seconds = Math.max(1, (observed.arrivalAt - at) / 1000)
  const desired =
    error < -10 ||
    (observed.phase === "dwelling" &&
      (observed.departureAt == null || at < observed.departureAt))
      ? 0
      : Math.min(
          clamp(remaining / seconds + error / 12, 0, 30),
          Math.sqrt(2 * 0.9 * remaining)
        )
  const speed = clamp(
    desired,
    Math.max(0, old.speed - 0.9 * dt),
    old.speed + 0.7 * dt
  )
  const distance = Math.min(
    target,
    old.distance + (old.speed + speed) * 0.5 * dt
  )
  const motion: TrainMotion = {
    ...observed,
    distance,
    target,
    speed: distance >= target ? 0 : speed,
    asOf: at,
  }
  return motion
}

/** The schematic only needs distance; geographic callers may also place it on the physical track. */
export const advanceTrainDisplay = (
  vehicle: VehiclePosition,
  previous: VehiclePosition | undefined,
  at: number,
  geographic = true
): VehiclePosition => {
  if (!vehicle.trainMotion) return vehicle
  const motion = advanceDisplayedTrainMotion(
    vehicle.trainMotion,
    previous?.trainMotion,
    at
  )
  if (!geographic) return { ...vehicle, trainMotion: motion }
  return {
    ...vehicle,
    ...placeTrainMotion(motion, at),
    vehicleId: vehicle.vehicleId,
    destinationName: vehicle.destinationName,
    color: vehicle.color,
  }
}
