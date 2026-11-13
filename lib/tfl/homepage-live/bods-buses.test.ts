import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { BODS_STALE_MS, parseSiriVm } from "@/lib/tfl/bods-siri-vm"
import { busesNearStop, MAX_MAP_BUSES } from "@/lib/tfl/homepage-live/bods-buses"

const NOW = Date.parse("2026-11-13T09:00:00Z")
const KX = { lat: 51.5308, lon: -0.1238 }

const activity = (ref: string, line: string, lat: number, lon: number, recordedAt: string) => `
  <VehicleActivity>
    <RecordedAtTime>${recordedAt}</RecordedAtTime>
    <MonitoredVehicleJourney>
      <LineRef>${line}</LineRef>
      <PublishedLineName>${line}</PublishedLineName>
      <DestinationName>Stoke Newington</DestinationName>
      <VehicleRef>${ref}</VehicleRef>
      <Bearing>90</Bearing>
      <VehicleLocation><Longitude>${lon}</Longitude><Latitude>${lat}</Latitude></VehicleLocation>
    </MonitoredVehicleJourney>
  </VehicleActivity>`

const feed = (rows: string[]) =>
  parseSiriVm(
    `<Siri><ServiceDelivery><VehicleMonitoringDelivery>${rows.join("")}</VehicleMonitoringDelivery></ServiceDelivery></Siri>`
  )

describe("buses on the map for a selected stop", () => {
  const activities = feed([
    activity("near73", "73", 51.532, -0.12, "2026-11-13T08:59:30Z"),
    activity("far73", "73", 51.6, -0.3, "2026-11-13T08:59:30Z"),
    activity("stale73", "73", 51.531, -0.124, "2026-11-13T08:50:00Z"),
    activity("other", "205", 51.531, -0.124, "2026-11-13T08:59:50Z"),
    activity("wrongRoute", "88", 51.531, -0.124, "2026-11-13T08:59:50Z"),
  ])

  it("keeps fresh fixes on the stop's routes within two kilometres", () => {
    const buses = busesNearStop(activities, ["73", "205"], KX, NOW)
    assert.deepEqual(buses.map((b) => b.id).sort(), ["near73", "other"])
    assert.equal(buses.find((b) => b.id === "other")!.route, "205")
  })

  it("lists nearest first and caps the count", () => {
    const many = feed(
      Array.from({ length: MAX_MAP_BUSES + 30 }, (_, i) =>
        activity(`b${i}`, "73", 51.5308 + i * 0.00005, -0.1238, "2026-11-13T08:59:50Z")
      )
    )
    const buses = busesNearStop(many, ["73"], KX, NOW)
    assert.equal(buses.length, MAX_MAP_BUSES)
    assert.equal(buses[0]!.id, "b0")
  })

  it("hides a fix older than 120 s and keeps one just inside", () => {
    const edge = feed([
      activity("inside", "73", 51.531, -0.124, "2026-11-13T08:58:10Z"),
      activity("outside", "73", 51.531, -0.124, "2026-11-13T08:57:59Z"),
    ])
    assert.equal(BODS_STALE_MS, 120_000)
    assert.deepEqual(busesNearStop(edge, ["73"], KX, NOW).map((b) => b.id), ["inside"])
  })

  it("marks a fix older than 90 s as stale and a newer one as fresh", () => {
    const mixed = feed([
      activity("fresh", "73", 51.531, -0.124, "2026-11-13T08:58:40Z"),
      activity("old", "73", 51.531, -0.124, "2026-11-13T08:58:20Z"),
    ])
    const stale = Object.fromEntries(
      busesNearStop(mixed, ["73"], KX, NOW).map((b) => [b.id, b.stale])
    )
    assert.deepEqual(stale, { fresh: false, old: true })
  })

  it("is empty for a stop with no routes", () => {
    assert.deepEqual(busesNearStop(activities, [], KX, NOW), [])
  })
})
