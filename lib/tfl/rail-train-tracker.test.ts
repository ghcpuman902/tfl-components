import assert from "node:assert/strict"
import { describe, it } from "node:test"
import length from "@turf/length"
import type { LineString } from "geojson"
import type { RealtimePrediction } from "tfl-ts"
import {
  RailTrainTracker,
  advanceTrainDisplay,
  fitTrainMotion,
  parseTrainLocation,
  predictionArrivalTime,
  predictionSourceTime,
  trainDistanceAt,
  trainRoutes,
} from "./rail-train-tracker"
import { vehiclesToCarriageGeoJSON } from "./map-vehicles"
import { railPolylinesForLine } from "./rail-vehicle-geometry"

const now = Date.parse("2026-10-12T12:00:00Z")
const row = (fields: Partial<RealtimePrediction> = {}): RealtimePrediction =>
  ({
    vehicleId: "231",
    lineId: "victoria",
    naptanId: "940GZZLUEUS",
    currentLocation: "Between Kings Cross St. Pancras and Euston",
    timestamp: new Date(now - 30000).toISOString(),
    timeToStation: 65,
    expectedArrival: new Date(now + 35000).toISOString(),
    direction: "inbound",
    destinationNaptanId: "940GZZLUBXN",
    ...fields,
  }) as RealtimePrediction

describe("recording-informed train tracking", () => {
  it("resolves truncated names and ampersands without confusing station-name 'and' with the hop separator", () => {
    assert.deepEqual(
      parseTrainLocation(
        "victoria",
        "Between Highbury & Islington and Kings Cross St. P"
      ),
      { kind: "between", from: "940GZZLUHAI", to: "940GZZLUKSX" }
    )
    assert.equal(
      parseTrainLocation("northern", "Approaching Clapham"),
      undefined
    )
    assert.equal(parseTrainLocation("victoria", "At Platform 2"), undefined)
    assert.equal(parseTrainLocation("northern", "Left Oval")?.kind, "departed")
  })
  it("uses absolute arrival and telemetry time rather than restarting a stale countdown at receive time", () => {
    assert.equal(predictionSourceTime(row(), now), now - 30000)
    assert.equal(predictionArrivalTime(row(), now), now + 35000)
    assert.equal(
      predictionArrivalTime(row({ expectedArrival: undefined }), now),
      now + 35000
    )
  })
  it("fits a bounded forward speed and trend over multiple observations", () => {
    const fit = fitTrainMotion(
      Array.from({ length: 7 }, (_, i) => ({
        at: now + i * 15000,
        distance: i * 150,
      }))
    )
    assert.ok(Math.abs(fit.speed - 10) < 0.01)
    assert.ok(Math.abs(fit.acceleration) < 0.01)
    assert.equal(
      fitTrainMotion([
        { at: now, distance: 100 },
        { at: now + 15000, distance: 0 },
      ]).speed,
      0
    )
  })
  it("identifies the current hop even when the only arrival prediction is several stations ahead", () => {
    const tracker = new RailTrainTracker()
    const [v] = tracker.ingest(
      [
        row({
          naptanId: "940GZZLUVIC",
          timeToStation: 400,
          expectedArrival: new Date(now + 370000).toISOString(),
        }),
      ],
      now
    )
    assert.equal(v?.nextStopId, "940GZZLUEUS")
    assert.equal(v?.fromStopId, "940GZZLUKSX")
  })
  it("does not rewind the display when the next observation moves behind the marker", () => {
    const tracker = new RailTrainTracker()
    const [first] = tracker.ingest([row()], now)
    let display = advanceTrainDisplay(first!, undefined, now)
    for (let i = 1; i <= 12; i++)
      display = advanceTrainDisplay(first!, display, now + i * 1000)
    const [late] = tracker.ingest(
      [
        row({
          expectedArrival: new Date(now + 100000).toISOString(),
          timestamp: new Date(now + 1000).toISOString(),
        }),
      ],
      now + 15000
    )
    for (let i = 15; i <= 35; i++) {
      const next = advanceTrainDisplay(late!, display, now + i * 1000)
      assert.ok(next.trainMotion!.distance >= display.trainMotion!.distance)
      assert.ok(next.trainMotion!.speed <= 30)
      display = next
    }
  })
  it("bounds coasting at the next platform and freezes old observations", () => {
    const tracker = new RailTrainTracker()
    const [v] = tracker.ingest([row()], now)
    const m = v!.trainMotion!
    assert.ok(trainDistanceAt(m, now + 600000) <= m.target)
    assert.equal(
      trainDistanceAt(m, now + 600000),
      trainDistanceAt(m, now + 90000)
    )
    const repeated = tracker.ingest([row()], now + 15000)[0]!
    assert.equal(tracker.tracks.get("victoria:231")!.motion.asOf, m.asOf)
    assert.ok(repeated.trainMotion!.distance >= m.distance)
    tracker.ingest([], now + 106000)
    assert.equal(tracker.tracks.size, 0)
  })
  it("propagates a delayed platform report into a plausible departure", () => {
    const tracker = new RailTrainTracker()
    const [v] = tracker.ingest(
      [
        row({
          currentLocation: "At Kings Cross St. Pancras",
          timestamp: new Date(now - 50000).toISOString(),
        }),
      ],
      now
    )
    const route = v!.trainMotion!.route
    const station = route.metres[route.stations.indexOf("940GZZLUKSX")]!
    assert.ok(v!.trainMotion!.distance > station)
    assert.ok(
      v!.trainMotion!.distance <=
        route.metres[route.stations.indexOf("940GZZLUEUS")]!
    )
  })
  it("keeps opposite directions on separate routes and draws each train as a carriage with a front", () => {
    const routes = trainRoutes("victoria")
    assert.ok(routes.some((r) => r.direction === "inbound"))
    assert.ok(routes.some((r) => r.direction === "outbound"))
    const [vehicle] = new RailTrainTracker().ingest([row()], now)
    const placed = advanceTrainDisplay(vehicle!, undefined, now)
    const [body, front] = vehiclesToCarriageGeoJSON(
      [placed],
      railPolylinesForLine("victoria")
    ).features
    assert.equal(body!.properties.part, "body")
    assert.equal(front!.properties.part, "front")
    // The front piece ends where the body ends: the leading end of the train.
    assert.deepEqual(
      front!.geometry.coordinates.at(-1),
      body!.geometry.coordinates.at(-1)
    )
    const km = (line: LineString) =>
      length({ type: "Feature", properties: {}, geometry: line })
    const ratio = km(front!.geometry) / km(body!.geometry)
    assert.ok(ratio > 0.15 && ratio < 0.3, `front is ${ratio} of the train`)
  })
})

describe("tracker recovery and calibration", () => {
  it("learns a hop duration only after a departure and an adjacent platform report", () => {
    const tracker = new RailTrainTracker()
    tracker.ingest(
      [
        row({
          currentLocation: "At Kings Cross St. Pancras",
          timestamp: new Date(now).toISOString(),
        }),
      ],
      now
    )
    tracker.ingest(
      [
        row({
          currentLocation: "Departed Kings Cross St. Pancras",
          timestamp: new Date(now + 30000).toISOString(),
          expectedArrival: new Date(now + 90000).toISOString(),
        }),
      ],
      now + 30000
    )
    tracker.ingest(
      [
        row({
          currentLocation: "At Euston",
          timestamp: new Date(now + 90000).toISOString(),
          naptanId: "940GZZLUWRR",
          expectedArrival: new Date(now + 150000).toISOString(),
        }),
      ],
      now + 90000
    )
    assert.ok(tracker.runTimes.has("victoria:940GZZLUKSX>940GZZLUEUS"))
    assert.equal(
      tracker.runTimes.get("victoria:940GZZLUKSX>940GZZLUEUS")?.[0],
      75
    )
  })
  it("carries a pending departure through a cached platform snapshot", () => {
    const tracker = new RailTrainTracker()
    const [v] = tracker.ingest(
      [
        row({
          currentLocation: "At Kings Cross St. Pancras",
          timestamp: new Date(now).toISOString(),
          expectedArrival: new Date(now + 100000).toISOString(),
        }),
      ],
      now
    )
    assert.equal(v!.trainMotion!.phase, "dwelling")
    assert.ok(v!.trainMotion!.departureAt! > now)
    assert.equal(
      trainDistanceAt(v!.trainMotion!, now + 5000),
      v!.trainMotion!.distance
    )
    assert.ok(
      trainDistanceAt(v!.trainMotion!, now + 85000) > v!.trainMotion!.distance
    )
  })
  it("rejects an older observation without resetting the accepted motion", () => {
    const tracker = new RailTrainTracker()
    tracker.ingest([row()], now)
    const accepted = tracker.tracks.get("victoria:231")!.motion
    tracker.ingest(
      [
        row({
          currentLocation: "At Highbury & Islington",
          timestamp: new Date(now - 60000).toISOString(),
        }),
      ],
      now + 15000
    )
    assert.equal(tracker.tracks.get("victoria:231")!.motion, accepted)
  })
})

describe("downstream prediction schedules", () => {
  it("keeps the freshest prediction when two reports describe the same platform", () => {
    const tracker = new RailTrainTracker()
    const freshest = row({
      timestamp: new Date(now - 10000).toISOString(),
      expectedArrival: new Date(now + 45000).toISOString(),
    })
    const stale = row({
      timestamp: new Date(now - 30000).toISOString(),
      expectedArrival: new Date(now + 120000).toISOString(),
    })
    const [vehicle] = tracker.ingest([stale, freshest], now)
    assert.equal(vehicle!.trainMotion!.arrivalAt, now + 45000)
  })

  it("waits at the platform before using an already received downstream prediction", () => {
    const [vehicle] = new RailTrainTracker().ingest([row()], now)
    const base = vehicle!.trainMotion!
    const i = base.route.stations.indexOf("940GZZLUEUS")
    const target = base.route.metres[i]!
    const followingTarget = base.route.metres[i + 1]!
    const motion = {
      ...base,
      distance: target,
      target,
      asOf: now,
      speed: 0,
      phase: "running" as const,
      arrivalAt: now,
      following: [
        {
          target: followingTarget,
          departureAt: now + 50000,
          arrivalAt: now + 85000,
        },
      ],
    }
    assert.equal(trainDistanceAt(motion, now + 49000), target)
    assert.ok(trainDistanceAt(motion, now + 60000) > target)
    assert.ok(trainDistanceAt(motion, now + 85000) <= followingTarget)
    let displayed = { ...vehicle!, trainMotion: motion }
    for (let t = now; t <= now + 85000; t += 250) {
      const next = advanceTrainDisplay(
        { ...vehicle!, trainMotion: motion },
        displayed,
        t,
        false
      )
      assert.ok(next.trainMotion!.distance >= displayed.trainMotion!.distance)
      displayed = next
    }
    assert.ok(displayed.trainMotion!.distance > target)
  })

  it("does not invent a departure without a consistent later station prediction", () => {
    const [vehicle] = new RailTrainTracker().ingest([row()], now)
    assert.deepEqual(vehicle!.trainMotion!.following, [])
    assert.ok(
      trainDistanceAt(vehicle!.trainMotion!, now + 85000) <=
        vehicle!.trainMotion!.target
    )
  })
})

it("uses downstream timing to distinguish a late train when its next platform prediction is missing", () => {
  const at = (seconds: number) => {
    const [vehicle] = new RailTrainTracker().ingest(
      [
        row({
          naptanId: "940GZZLUWRR",
          expectedArrival: new Date(now + seconds * 1000).toISOString(),
        }),
      ],
      now
    )
    return vehicle!.trainMotion!
  }
  const sooner = at(100)
  const later = at(150)
  assert.equal(sooner.route.id, later.route.id)
  assert.ok(sooner.distance > later.distance)
  assert.equal(later.arrivalAt - sooner.arrivalAt, 50000)
})

describe("trains without a vehicleId", () => {
  // Elizabeth line, Overground, DLR and tram rows usually carry no vehicleId.
  const route = trainRoutes("elizabeth").reduce((a, b) =>
    b.stations.length > a.stations.length ? b : a
  )
  const terminus = route.stations.at(-1)!
  const hopMs = 120_000
  /** Each offset is one train, that many ms behind the front train. */
  const poll = (at: number, offsets: readonly number[]) =>
    offsets.flatMap((offset) => {
      const progress = (at - now + 600_000 - offset) / hopMs
      const rows: RealtimePrediction[] = []
      for (let k = Math.floor(progress) + 1; k < route.stations.length; k++) {
        const eta = at + (k - progress) * hopMs
        if (eta - at > 1_800_000) break
        rows.push({
          vehicleId: "",
          lineId: "elizabeth",
          naptanId: route.stations[k],
          destinationNaptanId: terminus,
          currentLocation: "",
          timestamp: new Date(at - 5000).toISOString(),
          timeToStation: Math.round((eta - at) / 1000),
          expectedArrival: new Date(eta).toISOString(),
        } as RealtimePrediction)
      }
      return rows
    })

  it("chains anonymous predictions into trains and keeps their ids across polls", () => {
    const tracker = new RailTrainTracker()
    const offsets = [0, 360_000, 720_000]
    const frames: Map<string, number>[] = []
    for (let step = 0; step < 6; step++) {
      const at = now + step * 30_000
      const vehicles = tracker.ingest(poll(at, offsets), at)
      assert.equal(vehicles.length, offsets.length)
      frames.push(
        new Map(vehicles.map((v) => [v.vehicleId, v.trainMotion!.distance]))
      )
    }
    const ids = [...frames[0]!.keys()].sort()
    for (const frame of frames) assert.deepEqual([...frame.keys()].sort(), ids)
    for (const id of ids)
      assert.ok(frames.at(-1)!.get(id)! > frames[0]!.get(id)!, id)
  })

  it("leaves lines whose trains carry ids to the per-vehicle path", () => {
    const vehicles = new RailTrainTracker().ingest(
      [row(), row({ vehicleId: "000", naptanId: "940GZZLUGPK" })],
      now
    )
    assert.deepEqual(
      vehicles.map((v) => v.vehicleId),
      ["231"]
    )
  })
})
