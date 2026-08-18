/**
 * Derive the small TfL rail network snapshot from the Aubin / Transitous
 * Great Britain GTFS. Inspect first; download the zip once only if the cache
 * is missing; stream members; never explode or delete the archive.
 *
 *   pnpm network-model:snapshot
 *   pnpm network-model:snapshot -- --from /path/to/great_britain_gtfs.zip
 *   pnpm network-model:snapshot -- --inspect
 */
import { spawn } from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  buildNetworkSnapshot,
  isKeptRoute,
  KEPT_AGENCY_IDS,
  SHAPE_SIMPLIFY_M,
  streamCsvRows,
  winningShapeIds,
  type GtfsCalendar,
  type GtfsRoute,
  type GtfsShapePoint,
  type GtfsStop,
  type GtfsStopTime,
  type GtfsTrip,
} from "../lib/tfl/network-model/from-gtfs.ts"
import {
  listZipMembers,
  openZipMember,
  requireZipMember,
  zipLooksComplete,
  type ZipMember,
} from "../lib/tfl/network-model/zip-members.ts"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const CACHE_DIR = path.join(ROOT, ".cache/gtfs")
const CACHE_ZIP = path.join(CACHE_DIR, "great_britain_gtfs.zip")
const OUT_DIR = path.join(ROOT, "data/network-model")
const AUBIN_GTFS_URL = "https://beta.aubin.app/gtfs/great_britain_gtfs.zip"

const args = process.argv.slice(2)
const fromFlag = args.findIndex((arg) => arg === "--from")
const fromPath = fromFlag >= 0 ? args[fromFlag + 1] : undefined
const inspectOnly = args.includes("--inspect")

type RemoteInfo = {
  contentLength: number | null
  lastModified: string | null
}

const log = (message: string) => {
  console.log(message)
}

const headRemote = async (): Promise<RemoteInfo> => {
  const response = await fetch(AUBIN_GTFS_URL, { method: "HEAD" })
  const length = response.headers.get("content-length")
  return {
    contentLength: length ? Number(length) : null,
    lastModified: response.headers.get("last-modified"),
  }
}

const downloadOnce = async (dest: string, expectedBytes: number | null) => {
  await mkdir(path.dirname(dest), { recursive: true })
  log(`Downloading once to ${path.relative(ROOT, dest)} (keep until snapshot exists)`)
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "curl",
      [
        "-L",
        "--fail",
        "--retry",
        "3",
        "--retry-delay",
        "5",
        "-C",
        "-",
        "--progress-bar",
        "-o",
        dest,
        AUBIN_GTFS_URL,
      ],
      { stdio: "inherit" },
    )
    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`curl exited ${code}`))
    })
  })
  if (!(await zipLooksComplete(dest, expectedBytes ?? undefined))) {
    throw new Error("Download finished but the zip is incomplete or unreadable. Kept the file; retry the same command to resume.")
  }
}

const resolveZip = async (remote: RemoteInfo): Promise<string> => {
  const candidate = fromPath ? path.resolve(fromPath) : CACHE_ZIP
  if (await zipLooksComplete(candidate, fromPath ? undefined : remote.contentLength ?? undefined)) {
    log(`Reusing ${path.relative(ROOT, candidate)} — not downloading again`)
    return candidate
  }
  if (fromPath) {
    throw new Error(`--from ${fromPath} is missing or not a readable zip`)
  }
  if (remote.contentLength) {
    log(`Cache missing or incomplete. Remote ${remote.contentLength.toLocaleString()} bytes` +
      (remote.lastModified ? `, last-modified ${remote.lastModified}` : ""))
  }
  await downloadOnce(CACHE_ZIP, remote.contentLength)
  return CACHE_ZIP
}

const openMember = async (zipPath: string, members: readonly ZipMember[], name: string) => {
  const member = requireZipMember(members, name)
  log(
    `  stream ${name}  compressed=${member.compressedSize.toLocaleString()}  uncompressed=${member.uncompressedSize.toLocaleString()}`,
  )
  return openZipMember(zipPath, member)
}

const collectRoutes = async (
  zipPath: string,
  members: readonly ZipMember[],
): Promise<GtfsRoute[]> => {
  const routes: GtfsRoute[] = []
  let kept = 0
  let droppedBus = 0
  for await (const row of streamCsvRows(await openMember(zipPath, members, "routes.txt"))) {
    const route: GtfsRoute = {
      route_id: row.route_id ?? "",
      agency_id: row.agency_id ?? "",
      route_short_name: row.route_short_name,
      route_long_name: row.route_long_name,
      route_type: row.route_type,
      route_color: row.route_color,
      route_text_color: row.route_text_color,
    }
    if (!isKeptRoute(route)) {
      if (
        route.agency_id === "TFLO" ||
        route.route_type === "3" ||
        route.route_type === "714" ||
        route.route_id.endsWith("_BUS")
      ) {
        droppedBus += 1
      }
      continue
    }
    kept += 1
    routes.push(route)
  }
  log(`  kept ${kept} rail routes; dropped ${droppedBus} bus / replacement rows among others`)
  return routes
}

const collectFeedInfo = async (
  zipPath: string,
  members: readonly ZipMember[],
): Promise<Record<string, string>> => {
  for await (const row of streamCsvRows(await openMember(zipPath, members, "feed_info.txt"))) {
    return row
  }
  return {}
}

const inspectAgencies = async (
  zipPath: string,
  members: readonly ZipMember[],
) => {
  const seen = new Set<string>()
  for await (const row of streamCsvRows(await openMember(zipPath, members, "agency.txt"))) {
    const id = row.agency_id ?? ""
    if (KEPT_AGENCY_IDS.includes(id as (typeof KEPT_AGENCY_IDS)[number])) {
      seen.add(`${id}  ${row.agency_name ?? ""}`)
    }
  }
  log("  allow-list agencies present:")
  for (const line of [...seen].sort()) log(`    ${line}`)
}

const collectTrips = async (
  zipPath: string,
  members: readonly ZipMember[],
  keptRouteIds: ReadonlySet<string>,
): Promise<GtfsTrip[]> => {
  const trips: GtfsTrip[] = []
  let scanned = 0
  for await (const row of streamCsvRows(await openMember(zipPath, members, "trips.txt"))) {
    scanned += 1
    if (scanned % 500_000 === 0) log(`    … ${scanned.toLocaleString()} trips scanned`)
    const routeId = row.route_id ?? ""
    if (!keptRouteIds.has(routeId)) continue
    trips.push({
      trip_id: row.trip_id ?? "",
      route_id: routeId,
      service_id: row.service_id ?? "",
      direction_id: row.direction_id,
      shape_id: row.shape_id,
    })
  }
  log(`  kept ${trips.length.toLocaleString()} trips from ${scanned.toLocaleString()} scanned`)
  return trips
}

const collectStopTimes = async (
  zipPath: string,
  members: readonly ZipMember[],
  tripIds: ReadonlySet<string>,
): Promise<GtfsStopTime[]> => {
  const stopTimes: GtfsStopTime[] = []
  let scanned = 0
  for await (const row of streamCsvRows(await openMember(zipPath, members, "stop_times.txt"))) {
    scanned += 1
    if (scanned % 2_000_000 === 0) {
      log(`    … ${scanned.toLocaleString()} stop_times scanned, kept ${stopTimes.length.toLocaleString()}`)
    }
    const tripId = row.trip_id ?? ""
    if (!tripIds.has(tripId)) continue
    stopTimes.push({
      trip_id: tripId,
      stop_id: row.stop_id ?? "",
      stop_sequence: row.stop_sequence ?? "",
      arrival_time: row.arrival_time,
      departure_time: row.departure_time,
    })
  }
  log(`  kept ${stopTimes.length.toLocaleString()} stop_times from ${scanned.toLocaleString()} scanned`)
  return stopTimes
}

const collectStops = async (
  zipPath: string,
  members: readonly ZipMember[],
  wantedIds: ReadonlySet<string>,
): Promise<GtfsStop[]> => {
  const stops: GtfsStop[] = []
  const found = new Set<string>()
  const readPass = async (accept: (row: Record<string, string>) => boolean) => {
    for await (const row of streamCsvRows(await openMember(zipPath, members, "stops.txt"))) {
      if (!accept(row)) continue
      const stop: GtfsStop = {
        stop_id: row.stop_id ?? "",
        stop_name: row.stop_name,
        stop_lat: row.stop_lat,
        stop_lon: row.stop_lon,
        parent_station: row.parent_station,
        location_type: row.location_type,
      }
      if (found.has(stop.stop_id)) continue
      found.add(stop.stop_id)
      stops.push(stop)
    }
  }
  await readPass((row) => wantedIds.has(row.stop_id ?? ""))
  const missingParents = new Set<string>()
  for (const stop of stops) {
    const parent = stop.parent_station?.trim()
    if (parent && !found.has(parent)) missingParents.add(parent)
  }
  if (missingParents.size > 0) {
    log(`  second stops pass for ${missingParents.size} parent ids`)
    await readPass((row) => missingParents.has(row.stop_id ?? ""))
  }
  log(`  kept ${stops.length.toLocaleString()} stops`)
  return stops
}

const collectCalendars = async (
  zipPath: string,
  members: readonly ZipMember[],
  serviceIds: ReadonlySet<string>,
): Promise<GtfsCalendar[]> => {
  const calendars: GtfsCalendar[] = []
  for await (const row of streamCsvRows(await openMember(zipPath, members, "calendar.txt"))) {
    const serviceId = row.service_id ?? ""
    if (!serviceIds.has(serviceId)) continue
    calendars.push({
      service_id: serviceId,
      monday: row.monday ?? "0",
      tuesday: row.tuesday ?? "0",
      wednesday: row.wednesday ?? "0",
      thursday: row.thursday ?? "0",
      friday: row.friday ?? "0",
      saturday: row.saturday ?? "0",
      sunday: row.sunday ?? "0",
      start_date: row.start_date ?? "",
      end_date: row.end_date,
    })
  }
  log(`  kept ${calendars.length.toLocaleString()} calendars`)
  return calendars
}

const collectShapes = async (
  zipPath: string,
  members: readonly ZipMember[],
  shapeIds: ReadonlySet<string>,
): Promise<GtfsShapePoint[]> => {
  if (shapeIds.size === 0) return []
  const points: GtfsShapePoint[] = []
  let scanned = 0
  for await (const row of streamCsvRows(await openMember(zipPath, members, "shapes.txt"))) {
    scanned += 1
    if (scanned % 2_000_000 === 0) {
      log(`    … ${scanned.toLocaleString()} shape points scanned, kept ${points.length.toLocaleString()}`)
    }
    const shapeId = row.shape_id ?? ""
    if (!shapeIds.has(shapeId)) continue
    points.push({
      shape_id: shapeId,
      shape_pt_lat: row.shape_pt_lat ?? "",
      shape_pt_lon: row.shape_pt_lon ?? "",
      shape_pt_sequence: row.shape_pt_sequence ?? "",
    })
  }
  log(`  kept ${points.length.toLocaleString()} shape points from ${scanned.toLocaleString()} scanned`)
  return points
}

const inspectZip = async (zipPath: string) => {
  const members = await listZipMembers(zipPath)
  log(`Zip listing (${members.length} members, archive left intact):`)
  for (const member of members) {
    log(
      `  ${member.name.padEnd(24)} ${String(member.compressedSize).padStart(12)} → ${member.uncompressedSize.toLocaleString()}`,
    )
  }
  const feedInfo = await collectFeedInfo(zipPath, members)
  log(`feed_info publisher=${feedInfo.feed_publisher_name ?? "?"} version=${feedInfo.feed_version ?? "?"} ${feedInfo.feed_start_date ?? ""}–${feedInfo.feed_end_date ?? ""}`)
  await inspectAgencies(zipPath, members)
  return { members, feedInfo }
}

const main = async () => {
  log("Inspect remote (HEAD only)")
  const remote = await headRemote()
  log(
    `  ${AUBIN_GTFS_URL}\n  bytes=${remote.contentLength?.toLocaleString() ?? "unknown"} last-modified=${remote.lastModified ?? "unknown"}`,
  )

  const zipPath = await resolveZip(remote)
  const { members, feedInfo } = await inspectZip(zipPath)
  const routes = await collectRoutes(zipPath, members)

  if (inspectOnly) {
    log("Inspect-only: cache kept, no snapshot written.")
    return
  }

  const keptRouteIds = new Set(routes.map((route) => route.route_id))
  const trips = await collectTrips(zipPath, members, keptRouteIds)
  const tripIds = new Set(trips.map((trip) => trip.trip_id))
  const stopTimes = await collectStopTimes(zipPath, members, tripIds)
  const usedStopIds = new Set(stopTimes.map((row) => row.stop_id))
  const stops = await collectStops(zipPath, members, usedStopIds)
  const serviceIds = new Set(trips.map((trip) => trip.service_id))
  const calendars = await collectCalendars(zipPath, members, serviceIds)

  const shapeIds = winningShapeIds({
    routes,
    trips,
    stopTimes,
    stops,
    calendars,
  })
  log(`  ${shapeIds.size} winning Elizabeth / Overground shapes`)
  const shapes = await collectShapes(zipPath, members, shapeIds)

  log("Collapse to snapshot")
  const snapshot = buildNetworkSnapshot({
    routes,
    trips,
    stopTimes,
    stops,
    calendars,
    shapes,
    simplifyEpsilonM: SHAPE_SIMPLIFY_M,
  })

  const retrievedAt = new Date().toISOString()
  const manifest = {
    publisher: feedInfo.feed_publisher_name ?? "Aubin",
    publisherUrl: feedInfo.feed_publisher_url ?? "https://aubin.app/",
    retrievedAt,
    feedVersion: feedInfo.feed_version ?? "",
    feedStartDate: feedInfo.feed_start_date ?? "",
    feedEndDate: feedInfo.feed_end_date ?? "",
    sourceUrl: AUBIN_GTFS_URL,
    agencyFilter: [...KEPT_AGENCY_IDS],
    droppedRouteTypes: ["714"],
    shapeSimplifyM: SHAPE_SIMPLIFY_M,
    counts: {
      lines: snapshot.lines.length,
      stations: snapshot.stations.length,
      hubs: snapshot.hubs.length,
      patterns: snapshot.patterns.length,
      calls: snapshot.calls.length,
      calendars: snapshot.calendars.length,
      frequencies: snapshot.frequencies.length,
      paths: snapshot.paths.length,
      pathMatches: snapshot.pathMatches.length,
      movements: snapshot.movements.length,
    },
    attribution: [
      "Transport for London open data",
      "DfT Bus Open Data Service (OGL)",
      "Powered by National Rail Enquiries",
      "© OpenStreetMap contributors",
      "Aubin / Transitous Great Britain GTFS",
    ],
    note: "Raw zip stays in .cache/gtfs until this snapshot is the agreed low-resolution mapping. Do not delete it from the script.",
  }

  await mkdir(OUT_DIR, { recursive: true })
  const snapshotPath = path.join(OUT_DIR, "snapshot.json")
  const manifestPath = path.join(OUT_DIR, "manifest.json")
  await writeFile(snapshotPath, `${JSON.stringify(snapshot)}\n`)
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

  const snapshotBytes = Buffer.byteLength(JSON.stringify(snapshot))
  log(`Wrote ${path.relative(ROOT, snapshotPath)} (${(snapshotBytes / 1024).toFixed(1)} KB)`)
  log(`Wrote ${path.relative(ROOT, manifestPath)}`)
  log(
    `lines=${manifest.counts.lines} patterns=${manifest.counts.patterns} paths=${manifest.counts.paths} stations=${manifest.counts.stations}`,
  )
  log(`Cached zip kept at ${path.relative(ROOT, zipPath)}`)
}

await main()
