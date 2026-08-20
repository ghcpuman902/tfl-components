import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  completeBoardStage,
  createBoardSetupDraft,
  detectScreenProfile,
  markBoardSetupCompleted,
  markBoardSetupStarted,
  parseBoardSetupDraft,
} from "./board-setup-state"

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

  it("detects screen profile from viewport", () => {
    assert.equal(detectScreenProfile(390, 844).orientation, "portrait")
    assert.equal(detectScreenProfile(390, 844).profile, "small")
    assert.equal(detectScreenProfile(1280, 800).orientation, "landscape")
  })
})
