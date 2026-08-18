import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildNetworkSnapshot,
  canonicalLineId,
  isKeptRoute,
  parseCsvLine,
  parseGtfsTime,
  SHAPE_SIMPLIFY_M,
  simplifyLine,
  type GtfsCalendar,
  type GtfsRoute,
  type GtfsShapePoint,
  type GtfsStop,
  type GtfsStopTime,
  type GtfsTrip,
} from "./from-gtfs"

const bakerloo: GtfsRoute = {
  route_id: "10245790",
  agency_id: "LULD",
  route_short_name: "Bakerloo",
  route_type: "1",
  route_color: "a65a2a",
  route_text_color: "ffffff",
}

const elizabeth: GtfsRoute = {
  route_id: "XR",
  agency_id: "=XR",
  route_short_name: "Elizabeth line",
  route_type: "109",
  route_color: "9364cc",
}

const londonBus: GtfsRoute = {
  route_id: "55",
  agency_id: "TFLO",
  route_short_name: "55",
  route_type: "3",
}

const elizabethBus: GtfsRoute = {
  route_id: "XR_BUS",
  agency_id: "=XR",
  route_short_name: "Elizabeth line",
  route_type: "714",
  route_color: "9364cc",
}

const weekday: GtfsCalendar = {
  service_id: "wd",
  monday: "1",
  tuesday: "1",
  wednesday: "1",
  thursday: "1",
  friday: "1",
  saturday: "0",
  sunday: "0",
  start_date: "20260817",
  end_date: "20261109",
}

const saturday: GtfsCalendar = {
  service_id: "sat",
  monday: "0",
  tuesday: "0",
  wednesday: "0",
  thursday: "0",
  friday: "0",
  saturday: "1",
  sunday: "0",
  start_date: "20260817",
  end_date: "20261109",
}

const stops: GtfsStop[] = [
  {
    stop_id: "HUBHMX",
    stop_name: "Harrow & Wealdstone",
    stop_lat: 51.592,
    stop_lon: -0.335,
    location_type: "1",
  },
  {
    stop_id: "940GZZLUHAW",
    stop_name: "Harrow & Wealdstone Underground",
    stop_lat: 51.592,
    stop_lon: -0.335,
    parent_station: "HUBHMX",
  },
  {
    stop_id: "940GZZLUPAC",
    stop_name: "Paddington",
    stop_lat: 51.515,
    stop_lon: -0.175,
  },
  {
    stop_id: "940GZZLUEAC",
    stop_name: "Elephant & Castle",
    stop_lat: 51.495,
    stop_lon: -0.1,
  },
  {
    stop_id: "910GPADTLL",
    stop_name: "Paddington",
    stop_lat: 51.519,
    stop_lon: -0.178,
    parent_station: "910GPADTLL",
  },
  {
    stop_id: "910GLIVST",
    stop_name: "London Liverpool Street",
    stop_lat: 51.518,
    stop_lon: -0.081,
  },
  {
    stop_id: "unused-bus",
    stop_name: "Unused bus stop",
    stop_lat: 51.5,
    stop_lon: -0.1,
  },
]

const weekdayTrips: GtfsTrip[] = [
  {
    trip_id: "bak-wd-1",
    route_id: "10245790",
    service_id: "wd",
    direction_id: "0",
  },
  {
    trip_id: "bak-wd-2",
    route_id: "10245790",
    service_id: "wd",
    direction_id: "0",
  },
  {
    trip_id: "bak-wd-3",
    route_id: "10245790",
    service_id: "wd",
    direction_id: "0",
  },
]

const saturdayTrip: GtfsTrip = {
  trip_id: "bak-sat-1",
  route_id: "10245790",
  service_id: "sat",
  direction_id: "0",
}

const weekdayStopTimes: GtfsStopTime[] = weekdayTrips.flatMap((trip, index) => {
  const departure = `07:0${index * 5}:00`
  return [
    {
      trip_id: trip.trip_id,
      stop_id: "940GZZLUEAC",
      stop_sequence: 1,
      departure_time: departure,
    },
    {
      trip_id: trip.trip_id,
      stop_id: "940GZZLUPAC",
      stop_sequence: 2,
      departure_time: `07:${10 + index * 5}:00`,
    },
    {
      trip_id: trip.trip_id,
      stop_id: "940GZZLUHAW",
      stop_sequence: 3,
      departure_time: `07:${20 + index * 5}:00`,
    },
  ]
})

const saturdayStopTimes: GtfsStopTime[] = [
  {
    trip_id: "bak-sat-1",
    stop_id: "940GZZLUEAC",
    stop_sequence: 1,
    departure_time: "08:00:00",
  },
  {
    trip_id: "bak-sat-1",
    stop_id: "940GZZLUHAW",
    stop_sequence: 2,
    departure_time: "08:30:00",
  },
]

const elizabethTrip: GtfsTrip = {
  trip_id: "xr-1",
  route_id: "XR",
  service_id: "wd",
  direction_id: "0",
  shape_id: "XR-PAD-LST",
}

const elizabethStopTimes: GtfsStopTime[] = [
  {
    trip_id: "xr-1",
    stop_id: "910GPADTLL",
    stop_sequence: 1,
    departure_time: "07:12:00",
  },
  {
    trip_id: "xr-1",
    stop_id: "910GLIVST",
    stop_sequence: 2,
    departure_time: "07:20:00",
  },
]

const denseShape = (): GtfsShapePoint[] => {
  const points: GtfsShapePoint[] = []
  for (let index = 0; index <= 80; index += 1) {
    points.push({
      shape_id: "XR-PAD-LST",
      shape_pt_lon: -0.178 + index * 0.001,
      shape_pt_lat: 51.519,
      shape_pt_sequence: index,
    })
  }
  return points
}

describe("from-gtfs helpers", () => {
  it("keeps TfL rail agencies and drops buses", () => {
    assert.equal(isKeptRoute(bakerloo), true)
    assert.equal(isKeptRoute(elizabeth), true)
    assert.equal(isKeptRoute(londonBus), false)
    assert.equal(isKeptRoute(elizabethBus), false)
    assert.equal(canonicalLineId(bakerloo), "bakerloo")
    assert.equal(canonicalLineId(elizabeth), "elizabeth")
  })

  it("parses GTFS times and quoted CSV", () => {
    assert.equal(parseGtfsTime("07:05:00"), 7 * 3600 + 5 * 60)
    assert.equal(parseGtfsTime("24:15:00"), 24 * 3600 + 15 * 60)
    assert.deepEqual(parseCsvLine('a,"b,c",d'), ["a", "b,c", "d"])
  })

  it("simplifies a straight high-vertex line to the endpoints", () => {
    const coords = denseShape().map(
      (point) => [Number(point.shape_pt_lon), Number(point.shape_pt_lat)] as [number, number],
    )
    const simplified = simplifyLine(coords, SHAPE_SIMPLIFY_M)
    assert.equal(simplified.length, 2)
    assert.deepEqual(simplified[0], coords[0])
    assert.deepEqual(simplified[simplified.length - 1], coords[coords.length - 1])
  })
})

describe("buildNetworkSnapshot", () => {
  const snapshot = buildNetworkSnapshot({
    routes: [bakerloo, elizabeth, londonBus, elizabethBus],
    trips: [...weekdayTrips, saturdayTrip, elizabethTrip],
    stopTimes: [...weekdayStopTimes, ...saturdayStopTimes, ...elizabethStopTimes],
    stops,
    calendars: [weekday, saturday],
    shapes: denseShape(),
  })

  it("emits TfL rail lines only, with brand colours", () => {
    assert.deepEqual(
      snapshot.lines.map((line) => line.id),
      ["bakerloo", "elizabeth"],
    )
    const bakerlooLine = snapshot.lines.find((line) => line.id === "bakerloo")
    assert.ok(bakerlooLine)
    assert.equal(bakerlooLine.mode, "Underground")
    assert.match(bakerlooLine.color, /^#[0-9A-Fa-f]{6}$/)
    assert.notEqual(bakerlooLine.color.toLowerCase(), "#a65a2a")
  })

  it("collapses dated trips onto unique station sequences", () => {
    const bakerlooPatterns = snapshot.patterns.filter(
      (pattern) => pattern.lineId === "bakerloo",
    )
    assert.equal(bakerlooPatterns.length, 2)
    const weekdayPattern = bakerlooPatterns.find((pattern) => pattern.callIds.length === 3)
    const weekendPattern = bakerlooPatterns.find((pattern) => pattern.callIds.length === 2)
    assert.ok(weekdayPattern)
    assert.ok(weekendPattern)
    assert.deepEqual(weekdayPattern.callIds, [
      "940GZZLUEAC",
      "940GZZLUPAC",
      "HUBHMX",
    ])
    assert.equal(weekendPattern.callIds[0], "940GZZLUEAC")
    assert.equal(weekendPattern.callIds[1], "HUBHMX")
  })

  it("rolls calendars and weekday peak headway, and skips unused stops", () => {
    const weekdayPattern = snapshot.patterns.find(
      (pattern) => pattern.lineId === "bakerloo" && pattern.callIds.length === 3,
    )
    assert.ok(weekdayPattern)
    const calendar = snapshot.calendars.find(
      (row) => row.patternId === weekdayPattern.id,
    )
    assert.ok(calendar)
    assert.deepEqual(calendar.daysOfWeek, [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
    ])
    assert.equal(calendar.validFrom, "2026-08-17")
    const peak = snapshot.frequencies.find(
      (row) =>
        row.patternId === weekdayPattern.id &&
        row.timeWindow === "weekday 07:00–09:30",
    )
    assert.ok(peak)
    assert.equal(peak.headwaySeconds, 5 * 60)
    assert.equal(
      snapshot.stations.some((station) => station.id === "unused-bus"),
      false,
    )
    assert.ok(snapshot.stations.some((station) => station.id === "HUBHMX"))
  })

  it("keeps a low-resolution Elizabeth shape and a through-movement", () => {
    assert.equal(snapshot.paths.length, 1)
    assert.ok(snapshot.paths[0]!.geometry.coordinates.length < 10)
    assert.equal(snapshot.pathMatches.length, 1)
    assert.equal(snapshot.pathMatches[0]?.confidence, "exact")
    const weekdayPattern = snapshot.patterns.find(
      (pattern) => pattern.lineId === "bakerloo" && pattern.callIds.length === 3,
    )
    assert.ok(weekdayPattern)
    const movement = snapshot.movements.find(
      (row) =>
        row.fromStationId === "940GZZLUEAC" &&
        row.viaStationId === "940GZZLUPAC" &&
        row.toStationId === "HUBHMX",
    )
    assert.ok(movement)
    assert.deepEqual(movement.patternIds, [weekdayPattern.id])
  })
})
