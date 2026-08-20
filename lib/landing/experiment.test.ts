import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  assignLandingVariant,
  isBotUserAgent,
  LANDING_EXPERIMENT_ENABLED,
  parseLandingVariant,
} from "./experiment"

describe("landing experiment assignment", () => {
  it("stays disabled until staged Board is production", () => {
    assert.equal(LANDING_EXPERIMENT_ENABLED, false)
  })

  it("uses QA overrides without persisting them into production results", () => {
    const assignment = assignLandingVariant({
      enabled: true,
      deviceClass: "desktop",
      visitorId: "visitor-a",
      override: "room",
      isPreview: false,
      isBot: false,
      persisted: "simple",
    })
    assert.equal(assignment.variant, "room")
    assert.equal(assignment.qa, true)
    assert.equal(assignment.excludeFromResults, true)
    assert.equal(assignment.persist, false)
  })

  it("always assigns Simple on mobile when the experiment is enabled", () => {
    const assignment = assignLandingVariant({
      enabled: true,
      deviceClass: "mobile",
      visitorId: "visitor-a",
      override: null,
      isPreview: false,
      isBot: false,
      persisted: "room",
    })
    assert.equal(assignment.variant, "simple")
    assert.equal(assignment.excludeFromResults, false)
  })

  it("splits desktop visitors once enabled", () => {
    const room = assignLandingVariant({
      enabled: true,
      deviceClass: "desktop",
      visitorId: "aaaa",
      override: null,
      isPreview: false,
      isBot: false,
      persisted: null,
    })
    const simple = assignLandingVariant({
      enabled: true,
      deviceClass: "desktop",
      visitorId: "zzzz",
      override: null,
      isPreview: false,
      isBot: false,
      persisted: null,
    })
    assert.ok(room.variant === "room" || room.variant === "simple")
    assert.ok(simple.variant === "room" || simple.variant === "simple")
    assert.equal(parseLandingVariant("room"), "room")
    assert.equal(parseLandingVariant("nope"), null)
  })

  it("excludes preview deploys and bots", () => {
    const preview = assignLandingVariant({
      enabled: true,
      deviceClass: "desktop",
      visitorId: "visitor-a",
      override: null,
      isPreview: true,
      isBot: false,
      persisted: null,
    })
    const bot = assignLandingVariant({
      enabled: true,
      deviceClass: "desktop",
      visitorId: "visitor-a",
      override: null,
      isPreview: false,
      isBot: true,
      persisted: null,
    })
    assert.equal(preview.excludeFromResults, true)
    assert.equal(bot.excludeFromResults, true)
    assert.equal(isBotUserAgent("Googlebot/2.1"), true)
    assert.equal(isBotUserAgent("Mozilla/5.0"), false)
  })
})
