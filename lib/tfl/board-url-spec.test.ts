import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { BOARD_SETTINGS, URL_BOARD_SETTING_IDS } from "./board-settings"
import {
  BOARD_URL_EXAMPLES,
  BOARD_URL_IGNORED_PARAMS,
  BOARD_URL_PATH,
  boardUrlSpecParamNames,
  getBoardUrlParamSpecs,
} from "./board-url-spec"
import { parseBoardConfig } from "./board-url-state"

describe("board URL specification", () => {
  it("is generated from the parser settings and does not invent params", () => {
    const specs = getBoardUrlParamSpecs()
    const names = boardUrlSpecParamNames()
    const fromSettings = URL_BOARD_SETTING_IDS.map(
      (id) => BOARD_SETTINGS[id].param
    )

    assert.deepEqual(names.slice(0, fromSettings.length), fromSettings)
    assert.equal(names.at(-1), "key")
    assert.ok(names.every((name) => !name.includes("screen")))
    assert.ok(!names.includes("layout"))
    assert.ok(!names.includes("version"))
    for (const ignored of BOARD_URL_IGNORED_PARAMS) {
      assert.ok(!names.includes(ignored))
    }
    assert.ok(specs.every((item) => item.location === "fragment"))
    assert.ok(specs.every((item) => item.optional))
    assert.equal(BOARD_URL_PATH, "/board/view")
  })

  it("publishes examples the parser accepts", () => {
    const arrivals = parseBoardConfig(
      BOARD_URL_EXAMPLES.arrivalsAndStatus.split("#")[1] ?? ""
    )
    assert.equal(arrivals.stop, "940GZZLUOXC")

    const arrivalsOnly = parseBoardConfig(
      BOARD_URL_EXAMPLES.arrivalsOnly.split("#")[1] ?? ""
    )
    assert.deepEqual(arrivalsOnly.slots.p1, ["rail"])
    assert.equal(arrivalsOnly.slots.p2, undefined)

    const statusOnly = parseBoardConfig(
      BOARD_URL_EXAMPLES.statusOnly.split("#")[1] ?? ""
    )
    assert.deepEqual(statusOnly.slots.p1, ["status"])

    const noStop = parseBoardConfig(
      BOARD_URL_EXAMPLES.noStopStatus.split("#")[1] ?? ""
    )
    assert.equal(noStop.stop, undefined)
    assert.deepEqual(noStop.slots.p1, ["status"])

    assert.equal(
      BOARD_URL_EXAMPLES.portraitSmallScreen,
      BOARD_URL_EXAMPLES.arrivalsAndStatus
    )
  })
})
