/**
 * Fetch real stop-position nodes from the OSM route relations already
 * referenced by `data/geography/{mode}-geometry.json`.
 *
 * Why: the unique-track pipeline currently identifies "this point is a
 * station" by snapping TfL Unified API station points onto nearby OSM
 * track vertices within a fixed radius (`STATION_SNAP_M`). TfL's station
 * point and OSM's track polyline come from different sources, and at some
 * interchanges (tunnel portals, multi-level stations, post-simplification
 * drift) no polyline vertex survives within that radius — so the station
 * silently disappears from the derived topology.
 *
 * OSM's own route relations already tag stop-position nodes in running
 * order (`public_transport:version=2`: `stop`/`stop_entry_only`/
 * `stop_exit_only` roles). Those coordinates are authored against the same
 * track geometry that becomes our polyline, so they don't have the
 * cross-source drift problem. This script fetches ordered stop members and
 * relation tags once from Overpass. The cache supports station positioning
 * and route-pattern inspection. It does not treat relation count as service
 * frequency.
 *
 * Usage: pnpm tsx scripts/fetch-osm-route-stops.ts [mode ...]
 * (defaults to all modes; safe to re-run, result is cached to disk)
 */
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const DATA_ROOT = path.join(ROOT, "data/geography")
const CACHE_ROOT = path.join(DATA_ROOT, "osm-cache")
const OVERPASS_URL = "https://overpass-api.de/api/interpreter"

const MODES = ["tube", "overground", "elizabeth", "dlr", "tram"] as const
type Mode = (typeof MODES)[number]

const STOP_ROLES = new Set(["stop", "stop_entry_only", "stop_exit_only"])

type OverpassRelation = {
  type: "relation"
  id: number
  tags?: Record<string, string>
  members: { type: string; ref: number; role: string }[]
}

type OverpassNode = {
  type: "node"
  id: number
  lat: number
  lon: number
  tags?: Record<string, string>
}

type OsmRouteStop = {
  nodeId: number
  name: string
  coordinates: [number, number]
}

type OsmRouteRelationStop = {
  nodeId: number
  role: string
  name?: string
  coordinates?: [number, number]
}

type OsmRouteRelation = {
  relationId: number
  tags: Record<string, string>
  stops: OsmRouteRelationStop[]
}

type RelationStopRefs = {
  relationId: number
  tags: Record<string, string>
  stops: { nodeId: number; role: string }[]
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const runOverpassQuery = async (
  query: string,
  attempt = 1
): Promise<{ elements: (OverpassRelation | OverpassNode)[] }> => {
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    body: new URLSearchParams({ data: query }),
    headers: {
      accept: "*/*",
      "user-agent":
        "tfl-components-research-script/1.0 (+https://tfl.manglekuo.com)",
    },
  })
  const text = await res.text()
  if (!res.ok || text.trimStart().startsWith("<")) {
    if (attempt >= 4) {
      throw new Error(
        `Overpass query failed after ${attempt} attempts: ${text.slice(0, 300)}`
      )
    }
    const delay = attempt * 4000
    console.warn(
      `  Overpass busy (attempt ${attempt}), retrying in ${delay}ms…`
    )
    await sleep(delay)
    return runOverpassQuery(query, attempt + 1)
  }
  return JSON.parse(text)
}

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size))
  return out
}

const relationIdsForMode = async (mode: Mode): Promise<number[]> => {
  const raw = JSON.parse(
    await readFile(path.join(DATA_ROOT, `${mode}-geometry.json`), "utf8")
  ) as { lines: { features: { id?: string | number }[] } }
  const ids = new Set<number>()
  for (const feature of raw.lines.features) {
    const match = String(feature.id ?? "").match(/^relation\/(\d+)/)
    if (match) ids.add(Number(match[1]))
  }
  return [...ids]
}

const fetchRelationStopRefs = async (
  relationIds: number[]
): Promise<RelationStopRefs[]> => {
  const relations: RelationStopRefs[] = []
  const batchSize = relationIds.length > 100 ? 25 : 60
  for (const batch of chunk(relationIds, batchSize)) {
    const query = `[out:json][timeout:90];relation(id:${batch.join(",")});out body;`
    const result = await runOverpassQuery(query)
    for (const element of result.elements) {
      if (element.type !== "relation") continue
      const stops: RelationStopRefs["stops"] = []
      for (const member of element.members) {
        if (member.type === "node" && STOP_ROLES.has(member.role)) {
          stops.push({ nodeId: member.ref, role: member.role })
        }
      }
      relations.push({
        relationId: element.id,
        tags: element.tags ?? {},
        stops,
      })
    }
    await sleep(1000)
  }
  return relations
}

const fetchNodeStops = async (
  nodeIds: number[]
): Promise<Map<number, OsmRouteRelationStop>> => {
  const stops = new Map<number, OsmRouteRelationStop>()
  for (const batch of chunk(nodeIds, 300)) {
    const query = `[out:json][timeout:90];node(id:${batch.join(",")});out body;`
    const result = await runOverpassQuery(query)
    for (const element of result.elements) {
      if (element.type !== "node") continue
      const name = element.tags?.name
      stops.set(element.id, {
        nodeId: element.id,
        role: "stop",
        ...(name ? { name } : {}),
        coordinates: [element.lon, element.lat],
      })
    }
    await sleep(1000)
  }
  return stops
}

const fetchModeStops = async (mode: Mode): Promise<void> => {
  console.log(`\n${mode}: reading relation ids…`)
  const cachePath = path.join(CACHE_ROOT, `${mode}-route-stops.json`)
  const existingStops = await readFile(cachePath, "utf8")
    .then(
      (value) =>
        (
          JSON.parse(value) as {
            stops?: OsmRouteStop[]
          }
        ).stops ?? []
    )
    .catch(() => [])
  const relationIds = await relationIdsForMode(mode)
  console.log(`  ${relationIds.length} route relations`)

  const relationRefs = await fetchRelationStopRefs(relationIds)
  const stopNodeIds = new Set(
    relationRefs.flatMap((relation) =>
      relation.stops.map((stop) => stop.nodeId)
    )
  )
  console.log(`  ${stopNodeIds.size} unique stop-position nodes`)

  const stopsById = await fetchNodeStops([...stopNodeIds]).catch((error) => {
    if (existingStops.length === 0) throw error
    console.warn(
      `  node refresh failed; reusing ${existingStops.length} cached stop records`
    )
    return new Map<number, OsmRouteRelationStop>(
      existingStops.map((stop) => [
        stop.nodeId,
        {
          nodeId: stop.nodeId,
          role: "stop",
          name: stop.name,
          coordinates: stop.coordinates,
        },
      ])
    )
  })
  const stops: OsmRouteStop[] = [...stopsById.values()].flatMap((stop) =>
    stop.name && stop.coordinates
      ? [
          {
            nodeId: stop.nodeId,
            name: stop.name,
            coordinates: stop.coordinates,
          },
        ]
      : []
  )
  const relations: OsmRouteRelation[] = relationRefs.map((relation) => ({
    relationId: relation.relationId,
    tags: relation.tags,
    stops: relation.stops.map((stop) => {
      const node = stopsById.get(stop.nodeId)
      return {
        nodeId: stop.nodeId,
        role: stop.role,
        ...(node?.name ? { name: node.name } : {}),
        ...(node?.coordinates ? { coordinates: node.coordinates } : {}),
      }
    }),
  }))
  console.log(`  ${stops.length} named stops resolved`)

  await mkdir(CACHE_ROOT, { recursive: true })
  await writeFile(
    cachePath,
    `${JSON.stringify(
      {
        meta: {
          schemaVersion: 2,
          source: "osm-route-relations",
          note: "Relation tags and ordered stop-position members read directly from each OSM route relation. The top-level stops array remains as a backward-compatible unique-stop index.",
          relationCount: relationIds.length,
          retrievedAt: new Date().toISOString(),
        },
        stops,
        relations,
      },
      null,
      2
    )}\n`
  )
}

const requested = process.argv
  .slice(2)
  .filter((arg): arg is Mode => (MODES as readonly string[]).includes(arg))
const modes = requested.length > 0 ? requested : MODES

for (const mode of modes) {
  await fetchModeStops(mode)
}

console.log("\nDone.")
