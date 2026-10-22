import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  addLine,
  applyLayoutToConfig,
  canHidePanel,
  draftForStationPick,
  draftWithLayout,
  followStationStatusLines,
  heightLabel,
  heightSteps,
  layoutFromConfig,
  layoutSections,
  layoutSettingsAsOverrides,
  moveLineToTop,
  nearbyModesForLayout,
  placeLine,
  setPanelColumn,
  setPanelHeight,
  setPanelOn,
  stepHeight,
  statusStationPending,
  toggleSoloPanel,
  touchesLayoutSettings,
  undoStationStatusLines,
  withStatusOrder,
  withoutLayoutSettings,
} from "./board-customise"
import {
  createBoardSetupDraft,
  draftFromBoardConfig,
  parseBoardSetupDraft,
  statusLineOrderFromDraft,
} from "./board-setup-state"
import {
  DEFAULT_BOARD_CONFIG,
  buildBoardHref,
  parseBoardConfig,
  type BoardConfig,
} from "./board-url-state"

const base: BoardConfig = {
  ...DEFAULT_BOARD_CONFIG,
  stop: "940GZZLUOXC",
  slots: { p1: ["rail", "bus"], p2: ["status"] },
  arrivals: { lineOrder: ["central", "victoria", "bakerloo"] },
  bus: { stop: "490000173RC" },
  river: {},
  cycle: {},
  status: { lines: ["central", "victoria", "bakerloo"], overview: "network" },
}

const hashOf = (config: BoardConfig) =>
  buildBoardHref(config).split("#")[1] ?? ""

describe("customise layout", () => {
  it("reads the board's own slots, with every panel listed once", () => {
    const layout = layoutFromConfig(base)
    assert.deepEqual(
      layout.panels.map((p) => `${p.kind}:${p.column}:${p.on}`),
      [
        "rail:p1:true",
        "bus:p1:true",
        "status:p2:true",
        "river:p1:false",
        "cycle:p1:false",
      ]
    )
    assert.equal(layout.solo, null)
  })

  it("writes the same slots back, so an untouched layout keeps the board", () => {
    const config = applyLayoutToConfig(base, layoutFromConfig(base))
    assert.deepEqual(config.slots, base.slots)
  })

  it("Only show this puts one panel in a single column; Show everything brings the rest back", () => {
    const solo = toggleSoloPanel(layoutFromConfig(base), "status")
    assert.deepEqual(applyLayoutToConfig(base, solo).slots, {
      p1: ["status"],
      p2: [],
    })
    const back = toggleSoloPanel(solo, "status")
    assert.deepEqual(applyLayoutToConfig(base, back).slots, base.slots)
  })

  it("the eye hides a panel, but never the last one shown", () => {
    let layout = setPanelOn(layoutFromConfig(base), "bus", false)
    layout = setPanelOn(layout, "rail", false)
    assert.equal(canHidePanel(layout, "status"), false)
    assert.deepEqual(setPanelOn(layout, "status", false), layout)
    // Only status left: it moves to the wide column so the board is not empty.
    assert.deepEqual(applyLayoutToConfig(base, layout).slots, {
      p1: ["status"],
      p2: [],
    })
  })

  it("showing another panel ends Only show this", () => {
    const solo = toggleSoloPanel(layoutFromConfig(base), "status")
    const next = setPanelOn(solo, "river", true)
    assert.equal(next.solo, null)
  })

  it("leaves out panels with no stop yet, so the link never falls back to the demo", () => {
    const layout = setPanelOn(layoutFromConfig(base), "river", true)
    assert.deepEqual(applyLayoutToConfig(base, layout).slots, base.slots)
    const withPier = { ...base, river: { stop: "930GEMB" } }
    assert.deepEqual(applyLayoutToConfig(withPier, layout).slots.p1, [
      "rail",
      "bus",
      "river",
    ])
  })

  it("moves a panel between columns and splits into sections", () => {
    const layout = setPanelColumn(layoutFromConfig(base), "bus", "p2")
    assert.deepEqual(applyLayoutToConfig(base, layout).slots, {
      p1: ["rail"],
      p2: ["bus", "status"],
    })
    const sections = layoutSections(layout)
    assert.deepEqual(
      sections.wide.map((p) => p.kind),
      ["rail"]
    )
    assert.deepEqual(
      sections.narrow.map((p) => p.kind),
      ["bus", "status"]
    )
    assert.deepEqual(
      sections.off.map((p) => p.kind),
      ["river", "cycle"]
    )
  })

  it("heights: Full is the top end and writes 0; glance keeps owning rail rows", () => {
    assert.equal(heightSteps("bus").at(-1), 0)
    assert.equal(heightLabel("status", 0), "Full")
    assert.equal(heightLabel("rail", 1), "1 row per direction")
    assert.equal(stepHeight("bus", 8, 1), 0)
    assert.equal(stepHeight("bus", 0, 1), 0)
    assert.equal(stepHeight("cycle", 12, 1), 12)
    const layout = setPanelHeight(
      setPanelHeight(layoutFromConfig(base), "bus", 0),
      "rail",
      5
    )
    const config = applyLayoutToConfig(base, layout)
    assert.equal(config.bus.rows, 0)
    assert.equal(config.arrivals.rows, 5)
    assert.equal(
      applyLayoutToConfig({ ...base, view: "glance" }, layout).arrivals.rows,
      undefined
    )
  })

  it("strips and hands back the settings the layout owns", () => {
    const overrides = {
      slots: base.slots,
      bus: { rows: 4 },
      behaviour: "unattended" as const,
    }
    const stripped = withoutLayoutSettings(overrides)
    assert.equal(stripped.slots, undefined)
    assert.equal(stripped.bus?.rows, undefined)
    assert.equal(stripped.behaviour, "unattended")
    assert.equal(touchesLayoutSettings({ bus: { rows: 2 } }), true)
    assert.equal(touchesLayoutSettings({ behaviour: "interactive" }), false)
    const config = applyLayoutToConfig(
      base,
      setPanelHeight(layoutFromConfig(base), "bus", 6)
    )
    assert.equal(layoutSettingsAsOverrides(config).bus?.rows, 6)
  })

  it("a status-only board becomes Line status with Only show this", () => {
    const draft = { ...createBoardSetupDraft("d"), continueWithoutStop: true }
    const next = draftWithLayout(draft, base)
    assert.equal(next.continueWithoutStop, false)
    assert.equal(next.layout?.solo, "status")
  })

  it("turning on river or cycle asks the nearby lookup for them", () => {
    const draft = {
      ...createBoardSetupDraft("d"),
      nearbyModes: ["bus" as const],
    }
    const layout = setPanelOn(layoutFromConfig(base), "cycle", true)
    assert.deepEqual(nearbyModesForLayout(draft, layout), ["bus", "cycle"])
  })
})

describe("customise status priority", () => {
  const atOxford = {
    ...createBoardSetupDraft("d"),
    stopId: "940GZZLUOXC",
    lineIds: ["central", "victoria", "bakerloo"],
    statusLineIds: ["elizabeth"],
  }

  it("follows the station until the user edits it", () => {
    assert.deepEqual(statusLineOrderFromDraft(atOxford), [
      "central",
      "victoria",
      "bakerloo",
      "elizabeth",
    ])
    const edited = withStatusOrder(
      atOxford,
      moveLineToTop(statusLineOrderFromDraft(atOxford), "elizabeth")
    )
    assert.deepEqual(statusLineOrderFromDraft(edited), [
      "elizabeth",
      "central",
      "victoria",
      "bakerloo",
    ])
    assert.equal(statusStationPending(edited), false)
  })

  it("list helpers keep one of each line", () => {
    assert.deepEqual(placeLine(["a", "b", "c"], "a", 2), ["b", "c", "a"])
    assert.deepEqual(placeLine(["a", "b", "c"], "c", 0), ["c", "a", "b"])
    assert.deepEqual(addLine(["a", "b"], "a"), ["b", "a"])
  })

  it("Q4: a variant station pick keeps my order and offers the station's lines, with Undo", () => {
    const edited = withStatusOrder(atOxford, ["elizabeth", "central"])
    const picked = draftForStationPick(edited, {
      stopId: "940GZZLUKSX",
      stopName: "King's Cross St. Pancras",
      lineIds: ["northern", "piccadilly"],
      extraStatusLineIds: ["elizabeth"],
      keepStatusOrder: true,
    })
    assert.deepEqual(statusLineOrderFromDraft(picked), ["elizabeth", "central"])
    assert.equal(statusStationPending(picked), true)
    assert.equal(picked.busStopId, null)
    const { draft: followed, undo } = followStationStatusLines(picked)
    assert.deepEqual(statusLineOrderFromDraft(followed), [
      "northern",
      "piccadilly",
      "elizabeth",
    ])
    assert.equal(statusStationPending(followed), false)
    const undone = undoStationStatusLines(followed, undo)
    assert.deepEqual(statusLineOrderFromDraft(undone), ["elizabeth", "central"])
  })

  it("the default panel's pick still replaces the order", () => {
    const edited = withStatusOrder(atOxford, ["elizabeth", "central"])
    const picked = draftForStationPick(edited, {
      stopId: "940GZZLUKSX",
      stopName: null,
      lineIds: ["northern"],
      extraStatusLineIds: [],
      keepStatusOrder: false,
    })
    assert.equal(picked.statusOrder, null)
    assert.deepEqual(statusLineOrderFromDraft(picked), ["northern"])
  })
})

describe("customise shared state", () => {
  it("draft fields survive storage", () => {
    const layout = toggleSoloPanel(layoutFromConfig(base), "status")
    const draft = {
      ...withStatusOrder(
        { ...createBoardSetupDraft("d"), stopId: "940GZZLUOXC" },
        ["victoria", "central"]
      ),
      layout,
    }
    const parsed = parseBoardSetupDraft(JSON.parse(JSON.stringify(draft)))
    assert.deepEqual(parsed?.layout, layout)
    assert.deepEqual(parsed?.statusOrder, ["victoria", "central"])
    assert.equal(parsed?.statusOrderStopId, "940GZZLUOXC")
  })

  it("a link made in one variant reads back as the same board", () => {
    let layout = layoutFromConfig(base)
    layout = setPanelColumn(layout, "bus", "p2")
    layout = setPanelHeight(layout, "status", 4)
    const config = applyLayoutToConfig(
      {
        ...base,
        status: {
          lines: ["victoria", "central", "bakerloo"],
          overview: "network",
        },
      },
      layout
    )
    const parsed = parseBoardConfig(`#${hashOf(config)}`)
    assert.deepEqual(parsed.slots, { p1: ["rail"], p2: ["bus", "status"] })
    assert.equal(parsed.status.tiles, 4)
    const read = layoutFromConfig(parsed)
    assert.deepEqual(applyLayoutToConfig(parsed, read).slots, parsed.slots)
    // The custom status order is imported as the user's order.
    const draft = draftFromBoardConfig(parsed, { id: "d", screenProfile: null })
    assert.deepEqual(statusLineOrderFromDraft(draft), [
      "victoria",
      "central",
      "bakerloo",
    ])
    assert.equal(hashOf(applyLayoutToConfig(parsed, read)), hashOf(parsed))
  })
})
