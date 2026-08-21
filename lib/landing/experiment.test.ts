import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  assignLandingVariant,
  deviceClassFromUserAgent,
  isBotUserAgent,
  LANDING_EXPERIMENT_ENABLED,
  parseLandingAssignmentCookie,
  parseLandingVariant,
  serializeLandingAssignmentCookie,
} from "./experiment"

describe("landing experiment assignment", () => {
  it("stays disabled until assignment and analytics are verified in production", () => {
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

  it("classifies phones as mobile from the user agent and tablets as desktop", () => {
    assert.equal(
      deviceClassFromUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"
      ),
      "mobile"
    )
    assert.equal(
      deviceClassFromUserAgent(
        "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15"
      ),
      "desktop"
    )
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

  it("keeps the current homepage on preview while the experiment is disabled", () => {
    const preview = assignLandingVariant({
      enabled: false,
      deviceClass: "desktop",
      visitorId: "visitor-a",
      override: null,
      isPreview: true,
      isBot: false,
      persisted: null,
    })
    assert.equal(preview.variant, "control")
    assert.equal(preview.excludeFromResults, true)
  })

  it("excludes preview deploys and bots from results once enabled", () => {
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

  it("reuses a persisted desktop assignment and does not persist QA overrides", () => {
    const reused = assignLandingVariant({
      enabled: true,
      deviceClass: "desktop",
      visitorId: "visitor-a",
      override: null,
      isPreview: false,
      isBot: false,
      persisted: "room",
    })
    assert.equal(reused.variant, "room")
    assert.equal(reused.persist, true)

    const qa = assignLandingVariant({
      enabled: true,
      deviceClass: "desktop",
      visitorId: "visitor-a",
      override: "simple",
      isPreview: false,
      isBot: false,
      persisted: "room",
    })
    assert.equal(qa.persist, false)
    assert.equal(qa.excludeFromResults, true)
  })

  it("round-trips the assignment cookie without storing QA overrides", () => {
    const raw = serializeLandingAssignmentCookie("room")
    assert.equal(parseLandingAssignmentCookie(raw), "room")
    assert.equal(parseLandingAssignmentCookie("simple"), "simple")
    assert.equal(parseLandingAssignmentCookie(undefined), null)
  })
})
