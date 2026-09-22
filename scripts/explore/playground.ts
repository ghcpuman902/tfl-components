#!/usr/bin/env tsx
/**
 * Algorithm playground. Save to re-run: `pnpm explore`
 *
 * Naming / print live in `tidy.ts`. Edit `LINE` then `run`.
 */
import { LINE_STATION_SEQUENCES, STATION_HUBS } from "tfl-ts/meta"
import {
  printBanner,
  printResult,
  tidyRouteLabel,
  tidyStationName,
  writeProgress,
} from "./tidy.ts"

type FocusLine = "waterloo-city" | "elizabeth" | "northern" | "dlr"

/** Flip this: waterloo-city | elizabeth | northern | dlr */
const LINE: FocusLine = "elizabeth"

export type Stop = {
  id: string
  name: string
}

export type RoutePattern = {
  id: string
  lineId: string
  lineName: string
  direction: string
  serviceType: string
  name: string
  origin: Stop
  destination: Stop
  stations: Stop[]
}

export type RouteRef = {
  id: string
  name: string
}

export type Travel = {
  id: string
  name: string
  routes: RouteRef[]
}

export type NetworkNode = {
  /** Raw StopPoint id. Same display name may exist twice (910GLIVST vs 910GLIVSTLL). */
  id: string
  name: string
  hubId?: string
  /** Permitted next hops, retaining the route patterns that provide the evidence. */
  toward: Travel[]
}

export type PermittedMovement = {
  from: Stop
  via: Stop
  to: Stop
  routes: RouteRef[]
}

export type RouteNetwork = {
  nodes: NetworkNode[]
  movements: PermittedMovement[]
}

export type FastTrack = {
  kind: "fast-track"
  from: Stop
  to: Stop
  bypasses: Stop[]
  routes: RouteRef[]
  comparedWith: RouteRef[]
}

export const loadLine = (lineId: FocusLine): RoutePattern[] => {
  const sequence = LINE_STATION_SEQUENCES[lineId]
  const stopsById = new Map(
    sequence.stations.map((station) => [
      station.id,
      { id: station.id, name: tidyStationName(station.name) } satisfies Stop,
    ])
  )
  writeProgress(1, 1, sequence.lineName)
  return sequence.orderedRoutes.flatMap((route, index) => {
    const stations = route.stationIds.map(
      (id) => stopsById.get(id) ?? { id, name: id }
    )
    const origin = stations[0]
    const destination = stations.at(-1)
    if (!origin || !destination) return []
    return [
      {
        id: `${sequence.lineId}:${route.direction}:${index + 1}`,
        lineId: sequence.lineId,
        lineName: sequence.lineName,
        direction: route.direction,
        serviceType: route.serviceType,
        name: tidyRouteLabel(route.name),
        origin,
        destination,
        stations,
      } satisfies RoutePattern,
    ]
  })
}

/**
 * Keep the route evidence while unioning consecutive hops and triples.
 * Nodes stay on raw StopPoint id: hubs are display/interchange information,
 * not permission to invent travel between their member StopPoints.
 */
export const buildNetwork = (routes: readonly RoutePattern[]): RouteNetwork => {
  type NodeAcc = {
    id: string
    name: string
    hubId?: string
    toward: Map<
      string,
      {
        id: string
        name: string
        routes: Map<string, RouteRef>
      }
    >
  }
  type MovementAcc = Omit<PermittedMovement, "routes"> & {
    routes: Map<string, RouteRef>
  }

  const nodes = new Map<string, NodeAcc>()
  const movements = new Map<string, MovementAcc>()

  const nodeOf = (stop: Stop): NodeAcc => {
    const existing = nodes.get(stop.id)
    if (existing) return existing
    const created: NodeAcc = {
      id: stop.id,
      name: stop.name,
      hubId: STATION_HUBS[stop.id]?.hubId,
      toward: new Map(),
    }
    nodes.set(stop.id, created)
    return created
  }

  for (const route of routes) {
    const routeRef = { id: route.id, name: route.name }
    for (const stop of route.stations) nodeOf(stop)

    for (let i = 0; i < route.stations.length - 1; i++) {
      const a = route.stations[i]
      const b = route.stations[i + 1]
      if (!a || !b || a.id === b.id) continue
      const from = nodeOf(a)
      nodeOf(b)
      const travel = from.toward.get(b.id) ?? {
        id: b.id,
        name: b.name,
        routes: new Map(),
      }
      travel.routes.set(routeRef.id, routeRef)
      from.toward.set(b.id, travel)
    }

    for (let i = 1; i < route.stations.length - 1; i++) {
      const from = route.stations[i - 1]
      const via = route.stations[i]
      const to = route.stations[i + 1]
      if (!from || !via || !to) continue
      if (from.id === via.id || via.id === to.id || from.id === to.id) continue
      const key = `${from.id}|${via.id}|${to.id}`
      const movement = movements.get(key) ?? {
        from,
        via,
        to,
        routes: new Map(),
      }
      movement.routes.set(routeRef.id, routeRef)
      movements.set(key, movement)
    }
  }

  const nodeList = [...nodes.values()]
    .map((node) => ({
      id: node.id,
      name: node.name,
      hubId: node.hubId,
      toward: [...node.toward.values()]
        .map((travel) => ({
          id: travel.id,
          name: travel.name,
          routes: [...travel.routes.values()].sort((a, b) =>
            a.name.localeCompare(b.name, "en-GB")
          ),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "en-GB")),
    }))
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, "en-GB") || a.id.localeCompare(b.id)
    )

  const movementList = [...movements.values()]
    .map((movement) => ({
      from: movement.from,
      via: movement.via,
      to: movement.to,
      routes: [...movement.routes.values()].sort((a, b) =>
        a.name.localeCompare(b.name, "en-GB")
      ),
    }))
    .sort(
      (a, b) =>
        a.via.name.localeCompare(b.via.name, "en-GB") ||
        a.from.name.localeCompare(b.from.name, "en-GB") ||
        a.to.name.localeCompare(b.to.name, "en-GB")
    )

  return { nodes: nodeList, movements: movementList }
}

const edgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

const hubKey = (id: string) => STATION_HUBS[id]?.hubId ?? id

const namesCsv = (stops: readonly { name: string }[]) =>
  stops.map((stop) => stop.name).join(",")

const hubInspect = (id: string) => {
  const hub = STATION_HUBS[id]
  return {
    id,
    name: tidyStationName(hub?.hubName ?? id),
    hubId: hub?.hubId,
    members: (hub?.members ?? []).map((member) => ({
      id: member.id,
      name: tidyStationName(member.name),
      modes: [...member.modes],
      lines: [...member.lines],
    })),
    lineMemberIds: hub?.lineMemberIds ?? {},
  }
}

const stationsBetween = (
  route: RoutePattern,
  fromHub: string,
  toHub: string
): Stop[] | null => {
  const hubs = route.stations.map((stop) => hubKey(stop.id))
  for (let fromIndex = 0; fromIndex < hubs.length; fromIndex++) {
    if (hubs[fromIndex] !== fromHub) continue
    for (let toIndex = 0; toIndex < hubs.length; toIndex++) {
      if (hubs[toIndex] !== toHub || Math.abs(toIndex - fromIndex) <= 1) {
        continue
      }
      const start = Math.min(fromIndex, toIndex) + 1
      const end = Math.max(fromIndex, toIndex)
      return route.stations.slice(start, end)
    }
  }
  return null
}

/**
 * Classify a direct hop as fast track when another route pattern travels
 * between the same station hubs and calls at one or more stations between.
 *
 * Classification does not remove or otherwise privilege the hop. It remains
 * ordinary route and movement evidence in `buildNetwork`.
 */
export const classifyFastTracks = (
  routes: readonly RoutePattern[]
): FastTrack[] => {
  type FastTrackAcc = Pick<FastTrack, "from" | "to"> & {
    bypassesByHub: Map<string, Stop>
    routes: Map<string, RouteRef>
    comparedWith: Map<string, RouteRef>
  }

  const found = new Map<string, FastTrackAcc>()

  for (const route of routes) {
    for (let index = 0; index < route.stations.length - 1; index++) {
      const from = route.stations[index]
      const to = route.stations[index + 1]
      if (!from || !to) continue
      const fromHub = hubKey(from.id)
      const toHub = hubKey(to.id)

      for (const comparison of routes) {
        if (comparison.id === route.id) continue
        const bypasses = stationsBetween(comparison, fromHub, toHub)
        if (!bypasses || bypasses.length === 0) continue

        const key = edgeKey(from.id, to.id)
        const fastTrack = found.get(key) ?? {
          from,
          to,
          bypassesByHub: new Map(),
          routes: new Map(),
          comparedWith: new Map(),
        }
        fastTrack.routes.set(route.id, { id: route.id, name: route.name })
        fastTrack.comparedWith.set(comparison.id, {
          id: comparison.id,
          name: comparison.name,
        })
        for (const stop of bypasses) {
          fastTrack.bypassesByHub.set(hubKey(stop.id), stop)
        }
        found.set(key, fastTrack)
      }
    }
  }

  return [...found.values()]
    .map((fastTrack) => ({
      kind: "fast-track" as const,
      from: fastTrack.from,
      to: fastTrack.to,
      bypasses: [...fastTrack.bypassesByHub.values()],
      routes: [...fastTrack.routes.values()],
      comparedWith: [...fastTrack.comparedWith.values()],
    }))
    .sort((a, b) => a.from.name.localeCompare(b.from.name, "en-GB"))
}

const run = () => {
  const routes = loadLine(LINE)
  const network = buildNetwork(routes)
  const fastTracks = classifyFastTracks(routes)
  const stratfordIds = network.nodes.filter((node) =>
    node.name.includes("Stratford")
  )
  const whitechapelIds = network.nodes.filter((node) =>
    node.name.includes("Whitechapel")
  )
  const focusStationIds = new Set(
    [...stratfordIds, ...whitechapelIds].map((node) => node.id)
  )

  console.log(
    `${routes[0]?.lineName ?? LINE} · ${routes.length} route patterns · ${network.movements.length} permitted movements · ${fastTracks.length} fast tracks`
  )
  return {
    routes: routes.map((route) => ({
      route: route.name,
      direction: route.direction,
      origin: route.origin.name,
      destination: route.destination.name,
      calls: namesCsv(route.stations),
    })),
    movements: network.movements.map((movement) => ({
      movement: `${movement.from.name} → ${movement.via.name} → ${movement.to.name}`,
      routes: movement.routes.map((route) => route.name),
    })),
    fastTracks: fastTracks.map((fastTrack) => ({
      kind: fastTrack.kind,
      segment: `${fastTrack.from.name} ⇢ ${fastTrack.to.name}`,
      bypasses: fastTrack.bypasses.map((stop) => stop.name),
      routes: fastTrack.routes.map((route) => route.name),
      comparedWith: fastTrack.comparedWith.map((route) => route.name),
    })),
    hubs: {
      stratford: stratfordIds.map((node) => hubInspect(node.id)),
      whitechapel: whitechapelIds.map((node) => hubInspect(node.id)),
    },
    focusMovements: network.movements
      .filter((movement) => focusStationIds.has(movement.via.id))
      .map((movement) => ({
        movement: `${movement.from.name} → ${movement.via.name} → ${movement.to.name}`,
        routes: movement.routes.map((route) => route.name),
      })),
  }
}

const main = async () => {
  printBanner()
  try {
    const result = await run()
    if (result !== undefined) printResult(result)
  } catch (error) {
    console.error(error)
  }
}

void main()
