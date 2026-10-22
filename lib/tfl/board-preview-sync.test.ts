import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isPreviewReadyMessage,
  previewHashMessage,
  previewReadyMessage,
  readPreviewHashMessage,
} from "./board-preview-sync"

describe("board preview sync messages", () => {
  it("round-trips a hash", () => {
    const hash = "#stop=940GZZLUTWH&p1=rail,bus&p2=status"
    assert.equal(readPreviewHashMessage(previewHashMessage(hash)), hash)
  })

  it("allows an empty hash (no stop yet)", () => {
    assert.equal(readPreviewHashMessage(previewHashMessage("")), "")
  })

  it("ignores other messages and malformed hashes", () => {
    assert.equal(readPreviewHashMessage(null), null)
    assert.equal(readPreviewHashMessage("#stop=940GZZLUTWH"), null)
    assert.equal(readPreviewHashMessage({ type: "other", hash: "#a" }), null)
    assert.equal(
      readPreviewHashMessage({ type: "tfl-board-preview-hash", hash: 3 }),
      null
    )
    assert.equal(
      readPreviewHashMessage({
        type: "tfl-board-preview-hash",
        hash: "/elsewhere",
      }),
      null
    )
  })

  it("recognises the ready message only", () => {
    assert.equal(isPreviewReadyMessage(previewReadyMessage()), true)
    assert.equal(isPreviewReadyMessage(previewHashMessage("#a")), false)
    assert.equal(isPreviewReadyMessage(undefined), false)
  })
})
