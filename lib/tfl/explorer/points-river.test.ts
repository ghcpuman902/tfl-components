import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { LINE_STATION_SEQUENCES } from "tfl-ts"
import { HOME_RIVER_STOP } from "@/lib/tfl/home-arrivals-stops"
import { isFerryPortId } from "@/lib/tfl/river-bus"
import { buildExplorerRiverPiersFromTopology } from "./points-river"

describe("buildExplorerRiverPiersFromTopology", () => {
  it("lists every river-bus FerryPort from tfl-ts sequences", () => {
    const expected = new Set<string>()
    for (const sequence of Object.values(LINE_STATION_SEQUENCES)) {
      if (sequence.modeName !== "river-bus") continue
      for (const stop of sequence.stations) {
        if (isFerryPortId(stop.id)) expected.add(stop.id)
      }
    }

    const piers = buildExplorerRiverPiersFromTopology()
    assert.equal(piers.length, expected.size)
    assert.ok(piers.length > 10)
    assert.ok(piers.every((pier) => expected.has(pier.id)))
    assert.equal(piers[0]?.id, HOME_RIVER_STOP.id)
    assert.ok(piers.some((pier) => pier.id === "930GWWC"))
    assert.ok(
      piers
        .find((pier) => pier.id === "930GWMR")
        ?.lines.includes("rb1")
    )
  })
})
