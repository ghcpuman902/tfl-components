import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  mergeArrivalsByTime,
  parseBusStopIds,
  serializeBusStopIds,
} from "./board-bus-stops"
import { buildBoardHref, parseBoardConfig } from "./board-url-state"

describe("b.stop as a list", () => {
  it("an old single id is a one-stop list and round-trips unchanged", () => {
    assert.deepEqual(parseBusStopIds("490000173RC"), ["490000173RC"])
    const config = parseBoardConfig("#stop=940GZZLUOXC&b.stop=490000173RC")
    assert.equal(config.bus.stop, "490000173RC")
    assert.match(buildBoardHref(config), /b\.stop=490000173RC(&|$)/)
  })

  it("reads several ids and writes them comma-separated", () => {
    const config = parseBoardConfig("#b.stop=490G1,490G2")
    assert.deepEqual(parseBusStopIds(config.bus.stop), ["490G1", "490G2"])
    assert.match(buildBoardHref(config), /b\.stop=490G1,490G2(&|$)/)
  })

  it("drops empty parts, whitespace and duplicates", () => {
    assert.deepEqual(parseBusStopIds(" 490G1 ,, 490G2,490G1 , "), [
      "490G1",
      "490G2",
    ])
    assert.equal(serializeBusStopIds([" 490G2", "490G2", ""]), "490G2")
  })

  it("no stops leaves the param out", () => {
    assert.deepEqual(parseBusStopIds(""), [])
    assert.deepEqual(parseBusStopIds(undefined), [])
    assert.equal(serializeBusStopIds(" , "), undefined)
    assert.equal(parseBoardConfig("#b.stop=,").bus.stop, undefined)
  })

  it("merges stops' arrivals by time", () => {
    const merged = mergeArrivalsByTime([
      [{ id: "a", timeToStation: 120 }, { id: "b", timeToStation: 400 }],
      [{ id: "c", timeToStation: 60 }],
    ])
    assert.deepEqual(
      merged.map((row) => row.id),
      ["c", "a", "b"]
    )
  })
})
