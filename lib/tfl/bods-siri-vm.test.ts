import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  BODS_STALE_MS,
  bodsActivitiesToVehicles,
  boundingBoxFromGeometries,
  buildBodsDatafeedUrl,
  matchBodsLine,
  parseSiriVm,
  resolveBusPositionSource,
  type BodsVehicleActivity,
} from "@/lib/tfl/bods-siri-vm"
import type { BusRouteGeometry } from "@/lib/tfl/bus-geography-types"

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<Siri xmlns="http://www.siri.org.uk/siri">
  <ServiceDelivery>
    <VehicleMonitoringDelivery>
      <VehicleActivity>
        <RecordedAtTime>2026-08-17T21:00:00+00:00</RecordedAtTime>
        <MonitoredVehicleJourney>
          <LineRef>296</LineRef>
          <PublishedLineName>24</PublishedLineName>
          <DestinationName>Hampstead Heath</DestinationName>
          <VehicleRef>LTZ1234</VehicleRef>
          <VehicleLocation>
            <Longitude>-0.128</Longitude>
            <Latitude>51.508</Latitude>
          </VehicleLocation>
          <Bearing>180</Bearing>
        </MonitoredVehicleJourney>
      </VehicleActivity>
    </VehicleMonitoringDelivery>
  </ServiceDelivery>
</Siri>`

const activity = (
  overrides: Partial<BodsVehicleActivity> = {},
): BodsVehicleActivity => ({
  vehicleRef: "LTZ1234",
  lineRef: "296",
  publishedLineName: "24",
  destinationName: "Hampstead Heath",
  recordedAtTime: "2026-08-17T21:00:00+00:00",
  latitude: 51.508,
  longitude: -0.128,
  bearing: 180,
  ...overrides,
})

describe("parseSiriVm", () => {
  it("reads a BODS-shaped VehicleActivity", () => {
    const [row] = parseSiriVm(SAMPLE)
    assert.ok(row)
    assert.equal(row.vehicleRef, "LTZ1234")
    assert.equal(row.lineRef, "296")
    assert.equal(row.publishedLineName, "24")
    assert.equal(row.destinationName, "Hampstead Heath")
    assert.equal(row.latitude, 51.508)
    assert.equal(row.longitude, -0.128)
    assert.equal(row.bearing, 180)
  })
})

describe("resolveBusPositionSource", () => {
  it("keeps auto on dead-reckoning until a BODS key is configured", () => {
    assert.equal(resolveBusPositionSource("auto", false), "dead-reckoning")
    assert.equal(resolveBusPositionSource("auto", true), "gps")
    assert.equal(resolveBusPositionSource("gps", false), "dead-reckoning")
  })
})

describe("matchBodsLine", () => {
  it("matches the published route name, not the internal LineRef", () => {
    assert.equal(matchBodsLine(activity(), "24"), true)
    assert.equal(matchBodsLine(activity(), "296"), true)
    assert.equal(matchBodsLine(activity(), "29"), false)
  })
})

describe("buildBodsDatafeedUrl", () => {
  it("uses api_key and an optional bounding box", () => {
    const url = buildBodsDatafeedUrl({
      apiKey: "test-key",
      boundingBox: [-0.2, 51.4, -0.1, 51.6],
    })
    assert.equal(url.searchParams.get("api_key"), "test-key")
    assert.equal(url.searchParams.get("operatorRef"), "TFLO")
    assert.equal(url.searchParams.get("boundingBox"), "-0.200000,51.400000,-0.100000,51.600000")
  })
})

describe("boundingBoxFromGeometries", () => {
  it("pads stop coordinates", () => {
    const geometry: BusRouteGeometry = {
      routeId: "24",
      direction: "outbound",
      color: "#DC241F",
      stops: [
        { id: "a", name: "A", lat: 51.5, lon: -0.14, sequence: 0 },
        { id: "b", name: "B", lat: 51.52, lon: -0.12, sequence: 1 },
      ],
      segments: [],
    }
    const box = boundingBoxFromGeometries([geometry], 0.01)
    assert.ok(box)
    assert.equal(box[0].toFixed(2), "-0.15")
    assert.equal(box[1].toFixed(2), "51.49")
    assert.equal(box[2].toFixed(2), "-0.11")
    assert.equal(box[3].toFixed(2), "51.53")
  })
})

describe("bodsActivitiesToVehicles", () => {
  it("keeps fresh matching vehicles and drops stale ones", () => {
    const asOf = Date.parse("2026-08-17T21:01:00+00:00")
    const staleAt = new Date(asOf - BODS_STALE_MS - 1).toISOString()
    const vehicles = bodsActivitiesToVehicles(
      [
        activity(),
        activity({
          vehicleRef: "OLD1",
          recordedAtTime: staleAt,
        }),
        activity({
          vehicleRef: "OTHER",
          publishedLineName: "29",
          lineRef: "29",
        }),
      ],
      ["24"],
      asOf,
    )
    assert.equal(vehicles.length, 1)
    assert.equal(vehicles[0]?.vehicleId, "LTZ1234")
    assert.equal(vehicles[0]?.lineId, "24")
    assert.equal(vehicles[0]?.destinationName, "Hampstead Heath")
  })
})
