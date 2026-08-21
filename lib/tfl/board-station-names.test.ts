import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { HOME_RAIL_STOP } from "./home-arrivals-stops"
import {
  buildBoardStationNamesIndex,
  buildBoardStationSearchIndex,
  displayBoardStationValue,
  getBoardStationNamesIndex,
  looksLikeBoardStopId,
  lookupBoardStationName,
  matchBoardStationSearchItem,
  matchBoardStationSearchQuery,
  parseBoardStationPick,
  resolveBoardStationQuery,
  resolveBoardStopNameOverride,
} from "./board-station-names"

describe("buildBoardStationNamesIndex", () => {
  const index = buildBoardStationNamesIndex()

  it("resolves the display name for a known stop id", () => {
    assert.equal(
      lookupBoardStationName(index, HOME_RAIL_STOP.id),
      HOME_RAIL_STOP.name
    )
  })

  it("returns undefined for unknown stops", () => {
    assert.equal(lookupBoardStationName(index, "not-a-stop"), undefined)
    assert.equal(lookupBoardStationName(index, undefined), undefined)
    assert.equal(lookupBoardStationName(index, "  "), undefined)
  })

  it("memoises getBoardStationNamesIndex", () => {
    assert.equal(getBoardStationNamesIndex(), getBoardStationNamesIndex())
  })
})

describe("buildBoardStationSearchIndex", () => {
  const items = buildBoardStationSearchIndex()

  it("lists Oxford Circus with mode context", () => {
    const item = matchBoardStationSearchItem(items, HOME_RAIL_STOP.id)
    assert.equal(item?.name, HOME_RAIL_STOP.name)
    assert.match(item?.context ?? "", /Tube/)
  })

  it("matches an alias id to the primary station", () => {
    const withAlias = items.find((item) => item.aliasIds.length > 0)
    assert.ok(withAlias)
    const aliasId = withAlias.aliasIds[0]
    assert.ok(aliasId)
    const matched = matchBoardStationSearchItem(items, aliasId)
    assert.equal(matched?.id, withAlias.id)
  })

  it("matches King's Cross without apostrophe, period, or Saint spelled out", () => {
    const kings = items.find((item) => item.name === "King's Cross St. Pancras")
    assert.ok(kings)
    assert.equal(matchBoardStationSearchQuery(kings, "kings cross"), true)
    assert.equal(matchBoardStationSearchQuery(kings, "st pancras"), true)
    assert.equal(matchBoardStationSearchQuery(kings, "saint pancras"), true)
  })

  it("matches Liverpool Street from St and diagram Road abbreviations", () => {
    const liverpool = items.find((item) => item.name === "Liverpool Street")
    const finchley = items.find((item) => item.name === "Finchley Road")
    assert.ok(liverpool)
    assert.ok(finchley)
    assert.equal(matchBoardStationSearchQuery(liverpool, "liverpool st"), true)
    assert.equal(matchBoardStationSearchQuery(finchley, "finchley rd"), true)
  })

  it("adds line names when two stations share a display name", () => {
    const duplicates = items.filter(
      (item) => items.filter((other) => other.name === item.name).length > 1
    )
    if (duplicates.length === 0) return
    assert.ok(duplicates.every((item) => item.context.includes("·")))
  })
})

describe("parseBoardStationPick", () => {
  it("reads id and name from a search item", () => {
    assert.deepEqual(
      parseBoardStationPick({
        id: "940GZZLUPAC",
        name: "Paddington",
        context: "Elizabeth line · Tube",
        aliasIds: [],
      }),
      { id: "940GZZLUPAC", name: "Paddington" }
    )
  })

  it("reads id from JSON serialised by the combobox", () => {
    const json = JSON.stringify({
      id: "940GZZLUPAC",
      name: "Paddington",
      context: "Elizabeth line · Tube",
      aliasIds: ["HUBPAD"],
    })
    assert.deepEqual(parseBoardStationPick(json), {
      id: "940GZZLUPAC",
      name: "Paddington",
    })
  })

  it("treats a bare NaPTAN id as a pick", () => {
    assert.deepEqual(parseBoardStationPick("940GZZLUPAC"), {
      id: "940GZZLUPAC",
    })
  })

  it("returns undefined for empty or invalid values", () => {
    assert.equal(parseBoardStationPick(undefined), undefined)
    assert.equal(parseBoardStationPick(""), undefined)
    assert.equal(parseBoardStationPick("{not-json"), undefined)
    assert.equal(parseBoardStationPick({ name: "Paddington" }), undefined)
  })
})

describe("displayBoardStationValue", () => {
  it("shows the human name for a selected station", () => {
    const items = buildBoardStationSearchIndex()
    const selected = matchBoardStationSearchItem(items, HOME_RAIL_STOP.id)
    assert.equal(
      displayBoardStationValue(selected, JSON.stringify(selected)),
      HOME_RAIL_STOP.name
    )
  })

  it("never shows serialised JSON in the input", () => {
    const json = JSON.stringify({
      id: "940GZZLUOXC",
      name: "Oxford Circus",
      context: "Tube",
      aliasIds: [],
    })
    assert.equal(displayBoardStationValue(undefined, json), "Oxford Circus")
    assert.doesNotMatch(displayBoardStationValue(undefined, json), /\{/)
  })
})

describe("resolveBoardStationQuery", () => {
  const items = buildBoardStationSearchIndex()

  it("resolves a pasted Stop ID to the station", () => {
    const result = resolveBoardStationQuery(items, `  ${HOME_RAIL_STOP.id}  `)
    assert.equal(result.status, "match")
    if (result.status === "match") {
      assert.equal(result.item.id, HOME_RAIL_STOP.id)
      assert.equal(result.item.name, HOME_RAIL_STOP.name)
    }
  })

  it("resolves an alias id to the primary station", () => {
    const withAlias = items.find((item) => item.aliasIds.length > 0)
    assert.ok(withAlias)
    const aliasId = withAlias.aliasIds[0]
    assert.ok(aliasId)
    const result = resolveBoardStationQuery(items, aliasId)
    assert.equal(result.status, "match")
    if (result.status === "match") {
      assert.equal(result.item.id, withAlias.id)
    }
  })

  it("marks an unknown Stop ID without keeping a previous match", () => {
    const result = resolveBoardStationQuery(items, "940GZZLUNONE")
    assert.equal(result.status, "unknown-id")
  })

  it("leaves a station name for autocomplete instead of auto-selecting", () => {
    const result = resolveBoardStationQuery(items, "Oxford")
    assert.equal(result.status, "none")
    assert.equal(looksLikeBoardStopId("Oxford"), false)
  })

  it("resolves JSON serialised by the combobox to the station name", () => {
    const json = JSON.stringify({
      id: HOME_RAIL_STOP.id,
      name: HOME_RAIL_STOP.name,
      context: "Tube",
      aliasIds: [],
    })
    const result = resolveBoardStationQuery(items, json)
    assert.equal(result.status, "match")
    if (result.status === "match") {
      assert.equal(
        displayBoardStationValue(result.item, json),
        HOME_RAIL_STOP.name
      )
    }
  })
})

describe("resolveBoardStopNameOverride", () => {
  it("treats empty and catalog-matching names as no override", () => {
    assert.equal(
      resolveBoardStopNameOverride(undefined, "Oxford Circus"),
      undefined
    )
    assert.equal(resolveBoardStopNameOverride("  ", "Oxford Circus"), undefined)
    assert.equal(
      resolveBoardStopNameOverride("Oxford Circus", "Oxford Circus"),
      undefined
    )
  })

  it("keeps a custom label", () => {
    assert.equal(resolveBoardStopNameOverride("Home", "Oxford Circus"), "Home")
  })
})
