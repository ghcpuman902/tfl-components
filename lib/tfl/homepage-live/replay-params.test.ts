import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  parseReplayParams,
  replayRoundsFor,
} from "@/lib/tfl/homepage-live/replay-params"

describe("?replay=<fixture>&t=<seconds>", () => {
  it("maps seconds onto 30 s rounds and ignores unknown fixtures", () => {
    assert.deepEqual(parseReplayParams({ replay: "kx", t: "300" }), {
      fixture: "kx",
      round: 10,
    })
    assert.equal(parseReplayParams({ replay: "nope" }), undefined)
    assert.equal(parseReplayParams({}), undefined)
  })

  it("clamps to the recording and tolerates junk", () => {
    assert.equal(parseReplayParams({ replay: "kx", t: "99999" })?.round, 20)
    assert.equal(parseReplayParams({ replay: "kx", t: "-40" })?.round, 0)
    assert.equal(parseReplayParams({ replay: "kx", t: "abc" })?.round, 0)
  })

  it("holds the search answer back for the merge frame, within a cap", () => {
    assert.equal(parseReplayParams({ replay: "kx", t: "300", searchDelay: "1500" })?.searchDelayMs, 1500)
    assert.equal(parseReplayParams({ replay: "kx", searchDelay: "999999" })?.searchDelayMs, 10_000)
    assert.equal(parseReplayParams({ replay: "kx", searchDelay: "x" })?.searchDelayMs, undefined)
  })

  it("gives a frame the same warm-up rounds however it is reached", () => {
    assert.deepEqual(replayRoundsFor({ fixture: "kx", round: 10 }), [6, 7, 8, 9, 10])
    assert.deepEqual(replayRoundsFor({ fixture: "kx", round: 1 }), [0, 1])
  })
})
