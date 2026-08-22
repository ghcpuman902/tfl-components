import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { BOARD_VIEW_PATH } from "@/lib/tfl/board-url-state"
import {
  detectHomeScreenDisplayMode,
  detectHomeScreenPlatform,
  isBoardViewPath,
  isHomeScreenLaunch,
  shouldOfferBoardHomeScreenInstall,
  type HomeScreenPromptInput,
} from "./board-home-screen"

const offer = (
  overrides: Partial<HomeScreenPromptInput> = {}
): boolean =>
  shouldOfferBoardHomeScreenInstall({
    path: BOARD_VIEW_PATH,
    behaviour: "interactive",
    embedded: false,
    displayMode: "browser",
    platform: "ios",
    nativePromptAvailable: false,
    ...overrides,
  })

describe("board home-screen install policy", () => {
  it("only considers the rendered board path", () => {
    assert.equal(isBoardViewPath("/board/view"), true)
    assert.equal(isBoardViewPath("/board"), false)
    assert.equal(isBoardViewPath("/"), false)
    assert.equal(offer({ path: "/board" }), false)
    assert.equal(offer({ path: "/docs" }), false)
  })

  it("never offers a prompt on unattended boards", () => {
    assert.equal(offer({ behaviour: "unattended" }), false)
    assert.equal(
      offer({
        behaviour: "unattended",
        platform: "chromium",
        nativePromptAvailable: true,
      }),
      false
    )
  })

  it("never offers a prompt when already launched from the home screen", () => {
    assert.equal(isHomeScreenLaunch("fullscreen"), true)
    assert.equal(isHomeScreenLaunch("standalone"), true)
    assert.equal(isHomeScreenLaunch("browser"), false)
    assert.equal(offer({ displayMode: "fullscreen" }), false)
    assert.equal(offer({ displayMode: "standalone" }), false)
  })

  it("never offers a prompt inside an embed", () => {
    assert.equal(offer({ embedded: true }), false)
  })

  it("may offer later on interactive iOS or Chromium with a native prompt", () => {
    assert.equal(offer(), true)
    assert.equal(
      offer({ platform: "chromium", nativePromptAvailable: true }),
      true
    )
    assert.equal(
      offer({ platform: "chromium", nativePromptAvailable: false }),
      false
    )
    assert.equal(offer({ platform: "other" }), false)
  })

  it("treats iPadOS desktop UA as iOS, and Chrome-on-iOS as iOS", () => {
    assert.equal(
      detectHomeScreenPlatform({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
        maxTouchPoints: 5,
      }),
      "ios"
    )
    assert.equal(
      detectHomeScreenPlatform({
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1",
      }),
      "ios"
    )
    assert.equal(
      detectHomeScreenPlatform({
        userAgent:
          "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      }),
      "chromium"
    )
  })

  it("prefers fullscreen over standalone when both media queries match", () => {
    assert.equal(
      detectHomeScreenDisplayMode({
        fullscreen: true,
        standalone: true,
        minimalUi: false,
      }),
      "fullscreen"
    )
    assert.equal(
      detectHomeScreenDisplayMode({
        fullscreen: false,
        standalone: false,
        minimalUi: false,
        iosStandalone: true,
      }),
      "standalone"
    )
  })
})
