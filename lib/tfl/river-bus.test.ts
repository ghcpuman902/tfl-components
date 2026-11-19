import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { LINE_STATION_SEQUENCES, STATION_SEQUENCES_GENERATED_AT } from "tfl-ts"
import { buildBranchSchematic } from "./branch-schematic-layout"
import {
  BRANCH_SCHEMATICS_HORIZONTAL,
  BRANCH_SCHEMATICS_VERTICAL,
} from "./branch-schematics"
import {
  filterRiverBusArrivals,
  filterRiverBusLineIds,
  isFerryPortId,
  isRiverBusLineId,
  pointHasRiverBusLine,
  RIVER_BUS_LINE_IDS,
  riverRouteChipCopy,
} from "./river-bus"

describe("RIVER_BUS_LINE_IDS", () => {
  it("reads live river-bus ids from tfl-ts LINE_STATION_SEQUENCES", () => {
    const fromSnapshot = Object.values(LINE_STATION_SEQUENCES)
      .filter((sequence) => sequence.modeName === "river-bus")
      .map((sequence) => sequence.lineId)
      .sort((a, b) => a.localeCompare(b, "en"))
    assert.deepEqual(RIVER_BUS_LINE_IDS, fromSnapshot)
    assert.ok(RIVER_BUS_LINE_IDS.includes("rb1"))
    assert.ok(RIVER_BUS_LINE_IDS.includes("woolwich-ferry"))
    assert.equal(RIVER_BUS_LINE_IDS.includes("rb2"), false)
  })
})

describe("riverRouteChipCopy", () => {
  it("uppercases rb line ids", () => {
    assert.deepEqual(riverRouteChipCopy("rb1", "RB1"), {
      label: "RB1",
      ariaLabel: "RB1",
    })
  })

  it("abbreviates Woolwich Ferry and keeps the full name for assistive text", () => {
    assert.deepEqual(riverRouteChipCopy("woolwich-ferry", "Woolwich Ferry"), {
      label: "WF",
      ariaLabel: "Woolwich Ferry",
    })
  })
})

describe("filterRiverBusLineIds", () => {
  it("drops bus routes mixed onto a pier", () => {
    assert.deepEqual(filterRiverBusLineIds(["rb6", "22", "n22", "RB1"]), [
      "rb6",
      "rb1",
    ])
  })

  it("canonicalises spaced Woolwich Ferry ids", () => {
    assert.equal(isRiverBusLineId("Woolwich Ferry"), true)
    assert.deepEqual(filterRiverBusLineIds(["Woolwich Ferry", "22"]), [
      "woolwich-ferry",
    ])
  })
})

describe("filterRiverBusArrivals", () => {
  it("drops bus predictions mixed onto a pier payload", () => {
    assert.deepEqual(
      filterRiverBusArrivals([
        { lineId: "22" },
        { lineId: "rb6" },
        { lineId: "n22" },
      ]),
      [{ lineId: "rb6" }]
    )
  })
})

describe("pointHasRiverBusLine", () => {
  it("is true when any river-bus line is present", () => {
    assert.equal(pointHasRiverBusLine(["22", "rb6"]), true)
    assert.equal(pointHasRiverBusLine(["22", "n22"]), false)
  })
})

describe("isFerryPortId", () => {
  it("accepts parent piers and rejects berths", () => {
    assert.equal(isFerryPortId("930GWMR"), true)
    assert.equal(isFerryPortId("9300WMR"), false)
  })
})

describe("RB1/RB6 branch-schematic fixtures (TfL route change, 19 Nov 2026)", () => {
  const RIVER_ORDER_RB1 = [
    "Barking Riverside Pier",
    "Woolwich Arsenal Pier",
    "Royal Wharf Pier",
    "North Greenwich Pier",
    "Greenwich Pier",
    "Masthouse Terrace Pier",
    "Greenland Surrey Quays Pier",
    "Canary Wharf Pier",
    "Tower Pier",
    "London Bridge City Pier",
    "Bankside Pier",
    "Blackfriars Pier",
    "Embankment Pier",
    "Westminster Pier",
    "Millbank Pier",
    "Vauxhall St George Wharf Pier",
    "Battersea Power Station Pier",
  ]
  const RIVER_ORDER_RB6 = [
    ...RIVER_ORDER_RB1,
    "Cadogan Pier",
    "Chelsea Harbour Pier",
    "St Mary’s Wandsworth Pier",
    "Wandsworth Riverside Quarter Pier",
    "Putney Pier",
  ]

  const strips = (lineId: "rb1" | "rb6") => [
    BRANCH_SCHEMATICS_HORIZONTAL[lineId],
    BRANCH_SCHEMATICS_VERTICAL[lineId],
  ]

  for (const [lineId, order] of [
    ["rb1", RIVER_ORDER_RB1],
    ["rb6", RIVER_ORDER_RB6],
  ] as const) {
    it(`${lineId} is one lane in river order, each pier once`, () => {
      for (const schematic of strips(lineId)) {
        assert.ok(schematic, `${lineId} fixture missing`)
        const nodes = [...schematic.nodes].sort((a, b) => a.pos - b.pos)
        assert.deepEqual(
          nodes.map((node) => node.name),
          order
        )
        assert.ok(nodes.every((node) => node.lane === 0))
        assert.equal(schematic.edges.length, order.length - 1)
      }
    })
  }

  it("rb1 no longer has the single Barking Riverside → Bankside spine segment", () => {
    // The 14-pier "via Blackfriars" route is gone; the new 12-pier
    // BSP ↔ Barking Riverside route splits the east end at Greenwich and
    // Greenland Surrey Quays.
    for (const schematic of strips("rb1")) {
      const names = schematic.branches.map((branch) => branch.name)
      assert.equal(
        names.includes("Barking Riverside Pier → Bankside Pier"),
        false
      )
      assert.ok(names.includes("Barking Riverside Pier → Greenwich Pier"))
      assert.ok(names.includes("Greenland Surrey Quays Pier → Bankside Pier"))
    }
  })

  it("fixtures are byte-equal to a fresh build when the installed tfl-ts has the 19 Nov snapshot", (t) => {
    if (STATION_SEQUENCES_GENERATED_AT < "2026-11-19") {
      t.skip(
        `installed tfl-ts snapshot is ${STATION_SEQUENCES_GENERATED_AT}; fixtures were built from tfl-ts 2.16.0`
      )
      return
    }
    for (const lineId of ["rb1", "rb6"] as const) {
      assert.deepEqual(
        buildBranchSchematic(lineId, "horizontal"),
        BRANCH_SCHEMATICS_HORIZONTAL[lineId]
      )
      assert.deepEqual(
        buildBranchSchematic(lineId, "vertical"),
        BRANCH_SCHEMATICS_VERTICAL[lineId]
      )
    }
  })
})
