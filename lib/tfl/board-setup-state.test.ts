import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  completeBoardStage,
  createBoardSetupDraft,
  detectScreenProfile,
  draftFromBoardConfig,
  leftoverBoardConfig,
  markBoardSetupCompleted,
  markBoardSetupStarted,
  parseBoardSetupDraft,
  previewFrameForProfile,
  statusLineOrderFromDraft,
} from "./board-setup-state"
import { parseBoardConfig } from "./board-url-state"

describe("board setup draft", () => {
  it("starts on screen selection and records the first meaningful action once", () => {
    const draft = createBoardSetupDraft("draft-1")
    assert.equal(draft.stage, 1)
    assert.equal(draft.setupStarted, false)
    const started = markBoardSetupStarted(draft)
    assert.equal(started.setupStarted, true)
    assert.equal(markBoardSetupStarted(started).setupStarted, true)
  })

  it("advances stages without duplicating completion", () => {
    const started = markBoardSetupStarted(createBoardSetupDraft("draft-2"))
    const afterOne = completeBoardStage(started, 1)
    assert.equal(afterOne.stage, 2)
    assert.deepEqual(afterOne.completedStages, [1])
    const again = completeBoardStage(afterOne, 1)
    assert.deepEqual(again.completedStages, [1])
    assert.equal(again.stage, 2)
  })

  it("dedupes setup completed per draft", () => {
    const draft = createBoardSetupDraft("draft-3")
    const first = markBoardSetupCompleted(draft)
    assert.equal(first.firstCompletion, true)
    const second = markBoardSetupCompleted(first.draft)
    assert.equal(second.firstCompletion, false)
  })

  it("rejects invalid stored drafts", () => {
    assert.equal(parseBoardSetupDraft(null), null)
    assert.equal(parseBoardSetupDraft({ id: "x", stage: 9 }), null)
    const parsed = parseBoardSetupDraft({
      id: "ok",
      stage: 3,
      stopId: "940GZZLUOXC",
      lineIds: ["victoria"],
    })
    assert.equal(parsed?.stage, 3)
    assert.deepEqual(parsed?.lineIds, ["victoria"])
    assert.equal(parsed?.statusOnlyThese, false)
  })

  describe("returning visitor with an older Tower Hill draft", () => {
    // Shape saved by the first staged builder (b76e4ef): no busStopId,
    // riverStopId, cycleDockIds, statusOnlyThese, statusOrder or layout, and
    // the since-removed "this" screen profile.
    const OLD_TOWER_HILL_DRAFT = {
      id: "3f0c6a8e-old",
      stage: 5,
      screenProfile: "this",
      stopId: "940GZZLUTWH",
      stopName: "Tower Hill",
      continueWithoutStop: false,
      locationUsed: false,
      lineIds: ["district", "circle"],
      nearbyModes: ["bus"],
      statusLineIds: ["central"],
      keyMode: "skipped",
      setupStarted: true,
      completedStages: [1, 2, 3, 4],
      setupCompleted: true,
    }

    const reload = (stored: unknown) =>
      parseBoardSetupDraft(JSON.parse(JSON.stringify(stored)) as unknown)

    it("keeps the stop, name and lines and fills the newer fields", () => {
      const parsed = reload(OLD_TOWER_HILL_DRAFT)
      assert.ok(parsed)
      assert.equal(parsed.stopId, "940GZZLUTWH")
      assert.equal(parsed.stopName, "Tower Hill")
      assert.deepEqual(parsed.lineIds, ["district", "circle"])
      assert.equal(parsed.stage, 5)
      assert.equal(parsed.screenProfile, null)
      assert.equal(parsed.busStopId, null)
      assert.equal(parsed.statusOnlyThese, false)
      assert.equal(parsed.statusOrder, null)
      assert.equal(parsed.layout, null)
    })

    it("survives a save and reload round trip", () => {
      const first = reload(OLD_TOWER_HILL_DRAFT)
      const second = reload(first)
      assert.deepEqual(second, first)
      assert.equal(second?.stopId, "940GZZLUTWH")
    })

    it("keeps the stop when the stage was saved as a string", () => {
      const parsed = reload({ ...OLD_TOWER_HILL_DRAFT, stage: "5" })
      assert.equal(parsed?.stage, 5)
      assert.equal(parsed?.stopId, "940GZZLUTWH")
    })

    it("keeps the stop when the stage is missing or out of range", () => {
      const { stage: _stage, ...noStage } = OLD_TOWER_HILL_DRAFT
      void _stage
      assert.equal(reload(noStage)?.stage, 5)
      assert.equal(reload({ ...OLD_TOWER_HILL_DRAFT, stage: 7 })?.stage, 5)
      const early = reload({
        ...OLD_TOWER_HILL_DRAFT,
        stage: undefined,
        completedStages: [],
        setupCompleted: false,
      })
      assert.equal(early?.stage, 2)
      assert.equal(early?.stopId, "940GZZLUTWH")
    })

    it("keeps the stop when the draft has no id", () => {
      const { id: _id, ...noId } = OLD_TOWER_HILL_DRAFT
      void _id
      const parsed = reload(noId)
      assert.equal(parsed?.stopId, "940GZZLUTWH")
      assert.ok(parsed?.id)
    })

    it("dedupes repeated lines", () => {
      const parsed = reload({
        ...OLD_TOWER_HILL_DRAFT,
        lineIds: ["district", "circle", "district", 4],
      })
      assert.deepEqual(parsed?.lineIds, ["district", "circle"])
    })
  })

  it("keeps an explicit only-these-lines flag", () => {
    const parsed = parseBoardSetupDraft({
      id: "ok",
      stage: 3,
      statusOnlyThese: true,
      statusLineIds: ["victoria"],
    })
    assert.equal(parsed?.statusOnlyThese, true)
    assert.deepEqual(parsed?.statusLineIds, ["victoria"])
    assert.equal(createBoardSetupDraft().statusOnlyThese, false)
  })

  it("keeps nearby stop and dock ids from a stored draft", () => {
    const parsed = parseBoardSetupDraft({
      id: "ok",
      stage: 3,
      nearbyModes: ["bus", "cycle"],
      busStopId: "490000091G",
      cycleDockIds: ["BikePoints_237"],
    })
    assert.deepEqual(parsed?.nearbyModes, ["bus", "cycle"])
    assert.equal(parsed?.busStopId, "490000091G")
    assert.deepEqual(parsed?.cycleDockIds, ["BikePoints_237"])
    assert.equal(parsed?.riverStopId, null)
  })

  it("detects a wide or landscape viewport as large, and a narrow portrait as small", () => {
    assert.equal(detectScreenProfile(390, 844).orientation, "portrait")
    assert.equal(detectScreenProfile(390, 844).profile, "small")
    assert.equal(detectScreenProfile(1280, 800).orientation, "landscape")
    assert.equal(detectScreenProfile(1280, 800).profile, "large")
    assert.equal(detectScreenProfile(768, 1024).profile, "large")
    assert.equal(detectScreenProfile(1088, 1088).profile, "square")
  })

  it("maps screen profile to a fixed preview frame", () => {
    const small = previewFrameForProfile("small")
    const large = previewFrameForProfile("large")
    const square = previewFrameForProfile("square")
    assert.equal(small.width, 390)
    assert.equal(small.height, 844)
    assert.equal(small.chrome, "phone")
    assert.equal(large.width, 1280)
    assert.equal(large.height, 953)
    assert.equal(large.density, "roomy")
    assert.equal(square.width, 1088)
    assert.equal(square.height, 1088)
    assert.equal(square.density, "far")
  })

  it("maps a live board config into a completed Ready-stage draft", () => {
    const config = parseBoardConfig(
      "#stop=940GZZDLSHA&stopName=Shadwell&p1=rail,bus,cycle&p2=status&a.lines=dlr,windrush&b.stop=490014016N&c.docks=BikePoints_490,BikePoints_46&s.lines=dlr&s.tiles=4&behaviour=unattended&key=abc123"
    )
    const draft = draftFromBoardConfig(config, {
      id: "imported",
      screenProfile: "large",
    })
    assert.equal(draft.id, "imported")
    assert.equal(draft.stage, 5)
    assert.deepEqual(draft.completedStages, [1, 2, 3, 4])
    assert.equal(draft.setupStarted, true)
    assert.equal(draft.setupCompleted, true)
    assert.equal(draft.stopId, "940GZZDLSHA")
    assert.equal(draft.stopName, "Shadwell")
    assert.equal(draft.continueWithoutStop, false)
    assert.deepEqual(draft.lineIds, ["dlr", "windrush"])
    assert.deepEqual(draft.nearbyModes, ["bus", "cycle"])
    assert.equal(draft.busStopId, "490014016N")
    assert.deepEqual(draft.cycleDockIds, ["BikePoints_490", "BikePoints_46"])
    assert.deepEqual(draft.statusLineIds, ["dlr"])
    assert.equal(draft.keyMode, "shared")
    assert.equal(draft.screenProfile, "large")

    const leftover = leftoverBoardConfig(config)
    assert.equal(leftover.behaviour, "unattended")
    assert.equal(leftover.key, "abc123")
    assert.deepEqual(leftover.slots, { p1: ["rail", "bus", "cycle"], p2: ["status"] })
    assert.equal(leftover.status?.tiles, 4)
    assert.equal(leftover.arrivals?.lineOrder, undefined)
    assert.equal(leftover.bus?.stop, undefined)
  })

  it("marks a status-only board as continue-without-stop", () => {
    const config = parseBoardConfig("#p1=status&p2=&s.lines=victoria,northern")
    const draft = draftFromBoardConfig(config, { id: "status-only" })
    assert.equal(draft.continueWithoutStop, true)
    assert.equal(draft.stopId, null)
    assert.deepEqual(draft.statusLineIds, ["victoria", "northern"])
    assert.equal(draft.statusOnlyThese, false)
    assert.equal(draft.keyMode, "skipped")
    assert.deepEqual(draft.nearbyModes, [])
  })

  it("maps selection overview to only-these-lines", () => {
    const config = parseBoardConfig(
      "#p1=status&p2=&s.lines=victoria&s.overview=selection"
    )
    const draft = draftFromBoardConfig(config, { id: "watchlist" })
    assert.equal(draft.statusOnlyThese, true)
    assert.deepEqual(draft.statusLineIds, ["victoria"])
  })
})

describe("statusLineOrderFromDraft", () => {
  it("keeps the order the user set, not the network order", () => {
    assert.deepEqual(
      statusLineOrderFromDraft({
        lineIds: ["bakerloo", "central", "victoria"],
        statusLineIds: ["northern", "circle", "central"],
      }),
      ["bakerloo", "central", "victoria", "northern", "circle"]
    )
  })

  it("keeps a board link's order when the builder reopens it", () => {
    const lines = ["bakerloo", "central", "victoria", "northern", "circle"]
    const draft = draftFromBoardConfig(
      parseBoardConfig(
        `stop=940GZZLUOXC&a.lines=bakerloo,central,victoria&s.lines=${lines.join(",")}`
      )
    )
    assert.deepEqual(statusLineOrderFromDraft(draft), lines)
  })
})
