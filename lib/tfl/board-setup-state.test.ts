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
  })

  it("maps screen profile to a fixed preview frame", () => {
    const small = previewFrameForProfile("small")
    const large = previewFrameForProfile("large")
    assert.equal(small.width, 390)
    assert.equal(small.height, 844)
    assert.equal(small.chrome, "phone")
    assert.equal(large.width, 1280)
    assert.equal(large.height, 953)
    assert.equal(large.density, "roomy")
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
    assert.equal(draft.keyMode, "skipped")
    assert.deepEqual(draft.nearbyModes, [])
  })
})
