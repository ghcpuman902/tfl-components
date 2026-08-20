import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { LINE_STATION_SEQUENCES } from "tfl-ts"
import {
  buildStationCatalog,
  getStationCatalog,
} from "@/lib/tfl/station-catalog"

describe("buildStationCatalog", () => {
  const stations = buildStationCatalog()
  const byId = new Map(stations.map((station) => [station.id, station]))
  const byName = new Map(
    stations.map((station) => [station.displayName, station])
  )

  it("builds from tfl-ts LINE_STATION_SEQUENCES without a network round-trip", () => {
    assert.ok(Object.keys(LINE_STATION_SEQUENCES).length >= 20)
    assert.ok(stations.length >= 400)
  })

  it("includes Abbey Road from the DLR sequence", () => {
    const abbeyRoad = byName.get("Abbey Road")
    assert.ok(abbeyRoad)
    assert.ok(abbeyRoad.modes.includes("dlr"))
  })

  it("is sorted A–Z by display name", () => {
    const names = stations.map((station) => station.displayName)
    const sorted = [...names].sort((a, b) =>
      a.localeCompare(b, "en-GB", { sensitivity: "base" })
    )
    assert.deepEqual(names, sorted)
  })

  it("keeps interchange identity, modes, and lines", () => {
    const oxford = byId.get("940GZZLUOXC")
    assert.ok(oxford)
    assert.equal(oxford.displayName, "Oxford Circus")
    assert.ok(oxford.modes.includes("tube"))
    assert.ok(oxford.lines.includes("central"))
    assert.ok(oxford.lines.includes("bakerloo"))
    assert.ok(oxford.lines.includes("victoria"))
  })

  it("merges interchange siblings from STATION_HUBS, not display names", () => {
    const hammersmith = byName.get("Hammersmith")
    assert.ok(hammersmith)
    assert.ok(hammersmith.aliasIds.length >= 1)
    assert.ok(hammersmith.lines.includes("district"))
    assert.ok(hammersmith.lines.includes("hammersmith-city"))
  })

  it("keeps Liverpool Street as one station with tube and Elizabeth line", () => {
    const liverpool =
      byId.get("940GZZLULVT") ??
      byId.get("910GLIVST") ??
      byName.get("Liverpool Street")
    assert.ok(liverpool)
    assert.equal(liverpool.displayName, "Liverpool Street")
    assert.ok(liverpool.lines.includes("central"))
    assert.ok(liverpool.lines.includes("elizabeth"))
    assert.ok(
      liverpool.aliasIds.includes("910GLIVST") ||
        liverpool.aliasIds.includes("940GZZLULVT") ||
        liverpool.id === "910GLIVST" ||
        liverpool.id === "940GZZLULVT"
    )
  })

  it("memoises getStationCatalog to the same array", () => {
    assert.equal(getStationCatalog(), getStationCatalog())
  })
})
