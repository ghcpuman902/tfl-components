import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { DEFAULT_BOARD_CONFIG } from "./board-url-state"
import {
  isBoardReady,
  isUsableBoardConfig,
  parseBoardViewLink,
  resolveBoardReadiness,
} from "./board-view-resolve"

const SAMPLE_KEY = "abcdef0123456789abcdef0123456789"
const ORIGIN = "https://tfl.manglekuo.com"

describe("isUsableBoardConfig", () => {
  it("rejects the default omitted rail+status board with no stop", () => {
    assert.equal(isUsableBoardConfig(DEFAULT_BOARD_CONFIG), false)
  })

  it("accepts the default layout once a rail stop is set", () => {
    assert.equal(
      isUsableBoardConfig({ ...DEFAULT_BOARD_CONFIG, stop: "940GZZLUOXC" }),
      true
    )
  })

  it("accepts a status-only board with no stop", () => {
    assert.equal(
      isUsableBoardConfig({
        ...DEFAULT_BOARD_CONFIG,
        slots: { p1: ["status"] },
      }),
      true
    )
  })

  it("requires a bus stop, pier, or docks for those panels", () => {
    assert.equal(
      isUsableBoardConfig({
        ...DEFAULT_BOARD_CONFIG,
        slots: { p1: ["bus"] },
      }),
      false
    )
    assert.equal(
      isUsableBoardConfig({
        ...DEFAULT_BOARD_CONFIG,
        slots: { p1: ["bus"] },
        bus: { stop: "490000000A" },
      }),
      true
    )
    assert.equal(
      isUsableBoardConfig({
        ...DEFAULT_BOARD_CONFIG,
        slots: { p1: ["river"] },
      }),
      false
    )
    assert.equal(
      isUsableBoardConfig({
        ...DEFAULT_BOARD_CONFIG,
        slots: { p1: ["river"] },
        river: { stop: "930GXXX" },
      }),
      true
    )
    assert.equal(
      isUsableBoardConfig({
        ...DEFAULT_BOARD_CONFIG,
        slots: { p1: ["cycle"] },
      }),
      false
    )
    assert.equal(
      isUsableBoardConfig({
        ...DEFAULT_BOARD_CONFIG,
        slots: { p1: ["cycle"] },
        cycle: { docks: ["BikePoints_1"] },
      }),
      true
    )
  })

  it("rejects an empty slot list", () => {
    assert.equal(
      isUsableBoardConfig({
        ...DEFAULT_BOARD_CONFIG,
        slots: { p1: [], p2: [] },
      }),
      false
    )
  })
})

describe("isBoardReady", () => {
  it("needs both a usable layout and a key from either source", () => {
    const withStop = { ...DEFAULT_BOARD_CONFIG, stop: "940GZZLUOXC" }
    assert.equal(isBoardReady(DEFAULT_BOARD_CONFIG, SAMPLE_KEY), false)
    assert.equal(isBoardReady(withStop, null), false)
    assert.equal(isBoardReady(withStop, SAMPLE_KEY), true)
    assert.equal(
      isBoardReady({ ...withStop, key: SAMPLE_KEY }, null),
      true
    )
  })

  it("does not treat a key-only hash as a layout", () => {
    const readiness = resolveBoardReadiness(
      { ...DEFAULT_BOARD_CONFIG, key: SAMPLE_KEY },
      null
    )
    assert.deepEqual(readiness, {
      usableConfig: false,
      hasKey: true,
      ready: false,
    })
  })
})

describe("parseBoardViewLink", () => {
  it("asks for a complete link when the field is empty", () => {
    assert.deepEqual(parseBoardViewLink("   ", ORIGIN), {
      ok: false,
      error: "Paste the complete Board link.",
    })
  })

  it("rejects a bare key, the editor path, and unrelated URLs", () => {
    assert.equal(parseBoardViewLink(SAMPLE_KEY, ORIGIN).ok, false)
    assert.equal(
      parseBoardViewLink(`${ORIGIN}/board#stop=940GZZLUOXC&key=${SAMPLE_KEY}`, ORIGIN)
        .ok,
      false
    )
    const wrong = parseBoardViewLink("https://example.com/docs", ORIGIN)
    assert.deepEqual(wrong, {
      ok: false,
      error: "This is not a Board link.",
    })
  })

  it("rejects a Board view URL that is missing the layout or key", () => {
    assert.deepEqual(
      parseBoardViewLink(`${ORIGIN}/board/view#stop=940GZZLUOXC`, ORIGIN),
      {
        ok: false,
        error: "This link is missing the Board setup or TfL API key.",
      }
    )
    assert.deepEqual(
      parseBoardViewLink(`${ORIGIN}/board/view#key=${SAMPLE_KEY}`, ORIGIN),
      {
        ok: false,
        error: "This link is missing the Board setup or TfL API key.",
      }
    )
  })

  it("accepts a complete portable /board/view link", () => {
    const result = parseBoardViewLink(
      `${ORIGIN}/board/view#stop=940GZZLUOXC&key=${SAMPLE_KEY}`,
      ORIGIN
    )
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal(result.key, SAMPLE_KEY)
      assert.equal(result.config.stop, "940GZZLUOXC")
      assert.equal(result.config.key, SAMPLE_KEY)
    }
  })

  it("accepts a relative /board/view hash against the given origin", () => {
    const result = parseBoardViewLink(
      `/board/view#p1=status&key=${SAMPLE_KEY}`,
      ORIGIN
    )
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal(result.key, SAMPLE_KEY)
    }
  })
})
