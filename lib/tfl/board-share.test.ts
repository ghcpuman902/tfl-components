import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  BOARD_KEY_MODE_LABEL,
  boardConfigForShare,
  boardKeyModeFromPersist,
  boardQrPayload,
  buildShareableBoardHref,
  buildShareableBoardUrl,
  shareUrlIncludesKey,
  shareUrlKeyIsOnlyInHash,
} from "./board-share"
import { DEFAULT_BOARD_CONFIG } from "./board-url-state"

const SAMPLE = {
  ...DEFAULT_BOARD_CONFIG,
  stop: "940GZZLUOXC",
  key: "testkeyvalue0123456789abcdef0123",
}

describe("board key modes", () => {
  it("defaults to browser-storage when a local key is already saved", () => {
    assert.equal(boardKeyModeFromPersist("local", true), "browser")
    assert.equal(boardKeyModeFromPersist("session", true), "portable")
    assert.equal(boardKeyModeFromPersist("local", false), "portable")
  })

  it("omits the API key from the URL and QR in browser-storage mode", () => {
    const href = buildShareableBoardHref(SAMPLE, "browser")
    const url = buildShareableBoardUrl(
      "https://tfl.manglekuo.com",
      SAMPLE,
      "browser"
    )
    assert.equal(shareUrlIncludesKey(href), false)
    assert.equal(shareUrlIncludesKey(url), false)
    assert.doesNotMatch(href, /key=/)
    assert.equal(boardQrPayload(url), url)
    assert.doesNotMatch(boardQrPayload(url), /key=/)
    assert.equal(BOARD_KEY_MODE_LABEL.browser, "Key saved on this browser")
  })

  it("includes the key only in the hash in portable-link mode", () => {
    const href = buildShareableBoardHref(SAMPLE, "portable")
    const url = buildShareableBoardUrl(
      "https://tfl.manglekuo.com",
      SAMPLE,
      "portable"
    )
    assert.match(href, /^\/board\/view#/)
    assert.match(href, /key=/)
    assert.equal(shareUrlIncludesKey(url), true)
    assert.equal(shareUrlKeyIsOnlyInHash(url), true)
    assert.doesNotMatch(url.split("#")[0] ?? "", /key=/)
    assert.equal(BOARD_KEY_MODE_LABEL.portable, "Key in this link")
  })

  it("encodes the exact displayed Board URL as the QR payload", () => {
    const url = buildShareableBoardUrl(
      "https://tfl.manglekuo.com",
      SAMPLE,
      "portable"
    )
    assert.equal(boardQrPayload(url), url)
    assert.equal(
      boardQrPayload(
        buildShareableBoardUrl("https://tfl.manglekuo.com", SAMPLE, "browser")
      ),
      buildShareableBoardUrl("https://tfl.manglekuo.com", SAMPLE, "browser")
    )
  })

  it("updates the shareable URL when the stop changes", () => {
    const oxford = buildShareableBoardHref(
      { ...SAMPLE, stop: "940GZZLUOXC" },
      "browser"
    )
    const paddington = buildShareableBoardHref(
      { ...SAMPLE, stop: "940GZZLUPAC" },
      "browser"
    )
    assert.match(oxford, /stop=940GZZLUOXC/)
    assert.match(paddington, /stop=940GZZLUPAC/)
    assert.notEqual(oxford, paddington)
  })

  it("does not keep a key on the share config in browser mode", () => {
    const shared = boardConfigForShare(SAMPLE, "browser")
    assert.equal(shared.key, undefined)
    assert.equal(shared.stop, SAMPLE.stop)
    assert.equal(boardConfigForShare(SAMPLE, "portable").key, SAMPLE.key)
  })
})
