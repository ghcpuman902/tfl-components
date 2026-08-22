import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { HOME_RAIL_LINES } from "./home-arrivals-stops"
import {
  formatArrivalsRowsPlaceholder,
  formatArrivalsRowsPreview,
  resolveArrivalsProps,
  resolveEffectiveLineOrder,
  resolveEffectiveSections,
  resolveStatusProps,
} from "./board-config-resolve"
import {
  getBoardStationLinesIndex,
  lookupBoardStationLineGroups,
  lookupBoardStationLines,
} from "./board-station-lines"
import { DEFAULT_BOARD_CONFIG, type BoardConfig } from "./board-url-state"

const base = (arrivals: BoardConfig["arrivals"]): BoardConfig => ({
  ...DEFAULT_BOARD_CONFIG,
  stop: "940GZZLUOXC",
  arrivals,
})

describe("resolveEffectiveLineOrder", () => {
  it("uses canonical serving order when no explicit lines", () => {
    assert.deepEqual(resolveEffectiveLineOrder(base({}), HOME_RAIL_LINES), [
      "central",
      "victoria",
      "bakerloo",
    ])
  })

  it("treats explicit a.lines as a visible set, not order-plus-remainder", () => {
    assert.deepEqual(
      resolveEffectiveLineOrder(
        base({ lineOrder: ["victoria", "bakerloo"] }),
        HOME_RAIL_LINES
      ),
      ["victoria", "bakerloo"]
    )
  })

  it("skips explicit non-serving lines (does not seed)", () => {
    assert.deepEqual(
      resolveEffectiveLineOrder(
        base({ lineOrder: ["jubilee", "victoria"] }),
        HOME_RAIL_LINES
      ),
      ["victoria"]
    )
  })

  it("falls back to canonical data line ids when no offline membership", () => {
    assert.deepEqual(
      resolveEffectiveLineOrder(base({}), undefined, [
        "bakerloo",
        "victoria",
        "central",
      ]),
      ["central", "victoria", "bakerloo"]
    )
  })
})

describe("resolveArrivalsProps", () => {
  it("broadcasts scalar pageSize and seeds lines", () => {
    const props = resolveArrivalsProps(base({ rows: 6 }), HOME_RAIL_LINES)
    assert.equal(props.pageSize, 6)
    assert.equal(props.pageSizeByLine, undefined)
    assert.equal(props.lines, HOME_RAIL_LINES)
  })

  it("broadcasts scalar 3 to every section", () => {
    const props = resolveArrivalsProps(base({ rows: 3 }), HOME_RAIL_LINES)
    assert.equal(props.pageSize, 3)
    assert.equal(props.pageSizeByLine, undefined)
  })

  it("zips positional rows by canonical serving order", () => {
    const props = resolveArrivalsProps(
      base({ rows: [6, 2, 2] }),
      HOME_RAIL_LINES
    )
    assert.deepEqual(props.pageSizeByLine, {
      central: 6,
      victoria: 2,
      bakerloo: 2,
    })
  })

  it("filters the seeded lines list to the exclusive a.lines set", () => {
    const props = resolveArrivalsProps(
      base({ lineOrder: ["victoria", "bakerloo"] }),
      HOME_RAIL_LINES
    )
    assert.deepEqual(
      props.lines?.map((line) => line.lineId),
      ["victoria", "bakerloo"]
    )
    assert.deepEqual(props.lineOrder, ["victoria", "bakerloo"])
  })

  it("zips positional rows by explicit lineOrder", () => {
    const props = resolveArrivalsProps(
      base({
        rows: [6, 2, 2],
        lineOrder: ["victoria", "central", "bakerloo"],
      }),
      HOME_RAIL_LINES
    )
    assert.deepEqual(props.lineOrder, ["victoria", "central", "bakerloo"])
    assert.deepEqual(props.pageSizeByLine, {
      victoria: 6,
      central: 2,
      bakerloo: 2,
    })
  })

  it("fills shorter lists with gaps (default for unmatched)", () => {
    const props = resolveArrivalsProps(base({ rows: [6] }), HOME_RAIL_LINES)
    assert.deepEqual(props.pageSizeByLine, { central: 6 })
  })

  it("ignores longer list extras", () => {
    const props = resolveArrivalsProps(
      base({ rows: [6, 2, 2, 9, 9] }),
      HOME_RAIL_LINES
    )
    assert.deepEqual(props.pageSizeByLine, {
      central: 6,
      victoria: 2,
      bakerloo: 2,
    })
  })

  it("skips empty / undefined slots in the list", () => {
    const props = resolveArrivalsProps(
      base({ rows: [6, undefined, 2] }),
      HOME_RAIL_LINES
    )
    assert.deepEqual(props.pageSizeByLine, {
      central: 6,
      bakerloo: 2,
    })
  })

  it("explicit a.lines hides unlisted serving lines", () => {
    const props = resolveArrivalsProps(
      base({
        rows: [6, 2],
        lineOrder: ["victoria", "central"],
      }),
      HOME_RAIL_LINES
    )
    assert.deepEqual(props.pageSizeByLine, {
      victoria: 6,
      central: 2,
    })
    assert.deepEqual(
      props.lines?.map((line) => line.lineId),
      ["victoria", "central"]
    )
    assert.equal(
      props.lines?.some((line) => line.lineId === "bakerloo"),
      false
    )
  })
})

const livst = (arrivals: BoardConfig["arrivals"] = {}): BoardConfig => ({
  ...DEFAULT_BOARD_CONFIG,
  stop: "940GZZLULVT",
  arrivals,
})

describe("shared-platform sections", () => {
  const serving = lookupBoardStationLines(
    getBoardStationLinesIndex(),
    "940GZZLULVT"
  )
  const groups = lookupBoardStationLineGroups("940GZZLULVT")

  it("collapses Circle / H&C / Metropolitan into one Liverpool Street section", () => {
    const sections = resolveEffectiveSections(livst(), serving, [], groups)
    assert.deepEqual(
      sections.map((section) => section.lineId),
      ["central", "circle", "elizabeth", "weaver"]
    )
    const merged = sections.find((section) => section.lineId === "circle")
    assert.deepEqual(merged?.lineIds, [
      "circle",
      "hammersmith-city",
      "metropolitan",
    ])
    assert.equal(merged?.defaultPageSize, 6)
    assert.equal(
      merged?.lineName,
      "Circle, Hammersmith & City and Metropolitan"
    )
  })

  it("previews curated defaults, not a flat max 3 per line", () => {
    assert.equal(
      formatArrivalsRowsPreview(livst(), serving, groups),
      "Central: max 3, Circle, Hammersmith & City and Metropolitan: max 6, Elizabeth line: max 3, Weaver: max 3"
    )
    assert.equal(
      formatArrivalsRowsPlaceholder(
        resolveEffectiveSections(livst(), serving, [], groups)
      ),
      "3,6,3,3"
    )
  })

  it("broadcasts a lone 3 to every Liverpool Street section, including the merge", () => {
    assert.equal(
      formatArrivalsRowsPreview(livst({ rows: 3 }), serving, groups),
      "Central: max 3, Circle, Hammersmith & City and Metropolitan: max 3, Elizabeth line: max 3, Weaver: max 3"
    )
    const props = resolveArrivalsProps(livst({ rows: 3 }), serving, [], groups)
    assert.equal(props.pageSize, 3)
    assert.equal(props.pageSizeByLine, undefined)
  })

  it("treats 3, as first-slot only; empty slots keep section defaults", () => {
    assert.equal(
      formatArrivalsRowsPreview(
        livst({ rows: [3, undefined] }),
        serving,
        groups
      ),
      "Central: max 3, Circle, Hammersmith & City and Metropolitan: max 6, Elizabeth line: max 3, Weaver: max 3"
    )
    const props = resolveArrivalsProps(
      livst({ rows: [3, 6, undefined] }),
      serving,
      [],
      groups
    )
    assert.deepEqual(props.pageSizeByLine, {
      central: 3,
      circle: 6,
      "hammersmith-city": 6,
      metropolitan: 6,
    })
  })

  it("zips positional a.rows onto every member of a merged section", () => {
    const props = resolveArrivalsProps(
      livst({ rows: [4, 8, 2, 2] }),
      serving,
      [],
      groups
    )
    assert.deepEqual(props.pageSizeByLine, {
      central: 4,
      circle: 8,
      "hammersmith-city": 8,
      metropolitan: 8,
      elizabeth: 2,
      weaver: 2,
    })
  })

  it("does not pull unlisted merge members when a.lines is exclusive", () => {
    const sections = resolveEffectiveSections(
      livst({ lineOrder: ["elizabeth"] }),
      serving,
      [],
      groups
    )
    assert.deepEqual(
      sections.map((section) => section.lineId),
      ["elizabeth"]
    )
  })

  it("keeps Oxford Circus ungrouped", () => {
    assert.deepEqual(
      resolveEffectiveLineOrder(base({}), HOME_RAIL_LINES, [], undefined),
      ["central", "victoria", "bakerloo"]
    )
    assert.equal(
      formatArrivalsRowsPreview(base({}), HOME_RAIL_LINES),
      "Central: max 3, Victoria: max 3, Bakerloo: max 3"
    )
  })

  it("merges Circle and H&C at Baker Street; Metropolitan stays its own section", () => {
    const bakerServing = lookupBoardStationLines(
      getBoardStationLinesIndex(),
      "940GZZLUBST"
    )
    const bakerGroups = lookupBoardStationLineGroups("940GZZLUBST")
    const sections = resolveEffectiveSections(
      { ...DEFAULT_BOARD_CONFIG, stop: "940GZZLUBST", arrivals: {} },
      bakerServing,
      [],
      bakerGroups
    )
    const merged = sections.find((section) => section.lineId === "circle")
    assert.deepEqual(merged?.lineIds, ["circle", "hammersmith-city"])
    assert.ok(sections.some((section) => section.lineId === "metropolitan"))
    assert.equal(
      sections.some(
        (section) =>
          section.lineIds.includes("metropolitan") && section.lineIds.length > 1
      ),
      false
    )
  })
})

describe("resolveStatusProps", () => {
  it("defaults to an expanded network display", () => {
    const props = resolveStatusProps(DEFAULT_BOARD_CONFIG)
    assert.deepEqual(props, {
      surface: "display",
      tiles: 0,
      detailScope: "network",
      detailLineIds: undefined,
      dwellMs: undefined,
    })
  })

  it("uses serving line ids as detailLineIds when s.lines is empty", () => {
    const props = resolveStatusProps(
      DEFAULT_BOARD_CONFIG,
      HOME_RAIL_LINES.map((line) => line.lineId)
    )
    assert.deepEqual(props.detailLineIds, ["bakerloo", "central", "victoria"])
  })

  it("lets explicit s.lines win over serving line ids", () => {
    const props = resolveStatusProps(
      {
        ...DEFAULT_BOARD_CONFIG,
        status: { lines: ["jubilee"] },
      },
      HOME_RAIL_LINES.map((line) => line.lineId)
    )
    assert.deepEqual(props.detailLineIds, ["jubilee"])
  })

  it("keeps detailLineIds unset when there are no serving lines", () => {
    const props = resolveStatusProps(DEFAULT_BOARD_CONFIG, [])
    assert.equal(props.detailLineIds, undefined)
  })

  it("maps s.* config onto display props", () => {
    const props = resolveStatusProps({
      ...DEFAULT_BOARD_CONFIG,
      status: {
        surface: "strip",
        tiles: 2,
        lines: ["central", "victoria"],
        overview: "selection",
        dwell: 12,
      },
    })
    assert.deepEqual(props, {
      surface: "strip",
      tiles: 2,
      detailScope: "selection",
      detailLineIds: ["central", "victoria"],
      dwellMs: 12_000,
    })
  })
})
