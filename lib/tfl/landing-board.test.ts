import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { isBoardableBusStopId } from "@/lib/tfl/bus-stop-shape"
import { isUsableBoardConfig } from "@/lib/tfl/board-view-resolve"
import { isDemoStopArrivalsId } from "@/lib/tfl/cached-stop-arrivals"
import {
  getLandingBoardIndexes,
  LANDING_BOARD_DEFAULT,
  LANDING_BOARD_PRESETS,
  LANDING_DEMO_DOCK_IDS,
  LANDING_DEMO_STOP_IDS,
  nextLandingBoardHint,
} from "./landing-board"

describe("LANDING_BOARD_PRESETS", () => {
  it("starts on Clapham Common with the boardable 77 stop", () => {
    assert.equal(LANDING_BOARD_DEFAULT.id, "clapham-common")
    assert.equal(LANDING_BOARD_DEFAULT.config.stop, "940GZZLUCPC")
    assert.equal(LANDING_BOARD_DEFAULT.config.bus.stop, "490012162E")
    assert.equal(LANDING_BOARD_DEFAULT.config.bus.routes, undefined)
    assert.equal(LANDING_BOARD_DEFAULT.config.cycle.surface, "map")
    assert.deepEqual(LANDING_BOARD_DEFAULT.config.cycle.docks, [
      "BikePoints_612",
      "BikePoints_677",
    ])
    assert.equal(isBoardableBusStopId("490G00012162"), false)
    assert.equal(
      isBoardableBusStopId(LANDING_BOARD_DEFAULT.config.bus.stop!),
      true
    )
  })

  it("covers the five commute patterns with usable layouts", () => {
    assert.deepEqual(
      LANDING_BOARD_PRESETS.map((preset) => preset.id),
      [
        "clapham-common",
        "stoke-newington",
        "parsons-green",
        "ealing-broadway",
        "greenwich",
      ]
    )
    for (const preset of LANDING_BOARD_PRESETS) {
      assert.equal(isUsableBoardConfig(preset.config), true, preset.id)
      assert.equal(preset.config.status.overview, "network", preset.id)
      assert.ok((preset.config.status.lines?.length ?? 0) > 0, preset.id)
      const docks = preset.config.cycle.docks ?? []
      if (docks.length >= 2) {
        assert.equal(preset.config.cycle.surface, "map", preset.id)
      } else if (docks.length === 1) {
        assert.equal(preset.config.cycle.surface, "display", preset.id)
      }
      if (preset.config.bus.stop) {
        assert.equal(preset.config.bus.routes, undefined, preset.id)
      }
    }
  })

  it("allowlists every landing stop and dock for the site key", () => {
    for (const id of LANDING_DEMO_STOP_IDS) {
      assert.equal(isDemoStopArrivalsId(id), true, id)
    }
    assert.ok(LANDING_DEMO_DOCK_IDS.includes("BikePoints_612"))
    assert.ok(LANDING_DEMO_DOCK_IDS.includes("BikePoints_481"))
    assert.equal(
      nextLandingBoardHint(0),
      "Show Stoke Newington to Shoreditch"
    )
  })
})

describe("getLandingBoardIndexes", () => {
  it("slices serving lines and names for every rail origin", () => {
    const indexes = getLandingBoardIndexes()
    for (const preset of LANDING_BOARD_PRESETS) {
      const stop = preset.config.stop!
      assert.ok(indexes.stationNames[stop], stop)
      assert.ok(indexes.stationLines[stop]?.length, stop)
    }
    assert.equal(indexes.stationNames["940GZZLUCPC"], "Clapham Common")
    assert.deepEqual(
      indexes.stationLines["940GZZLUCPC"]?.map((line) => line.lineId),
      ["northern"]
    )
  })
})
