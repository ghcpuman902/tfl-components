import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildBugTemplate,
  FEEDBACK_ABOUT_OPTIONS,
  FEEDBACK_ABOUT_TOPICS,
  parseBugTemplate,
  suggestComponentForPage,
} from "./bug-template"

describe("buildBugTemplate / parseBugTemplate", () => {
  it("round-trips structured fields", () => {
    const text = buildBugTemplate(
      "Board clips on mobile",
      "1. Open arrivals\n2. Resize",
      "Tube & Rail Arrivals"
    )
    assert.match(
      text,
      /^::: What happened, and what did you expect instead\? :::/m
    )
    assert.match(text, /^::: Steps to reproduce :::/m)
    assert.match(text, /^::: What's this about\? :::/m)

    const parsed = parseBugTemplate(text)
    assert.equal(parsed.matched, true)
    assert.equal(parsed.description, "Board clips on mobile")
    assert.equal(parsed.steps, "1. Open arrivals\n2. Resize")
    assert.equal(parsed.component, "Tube & Rail Arrivals")
  })

  it("dumps unstructured notes into description", () => {
    const parsed = parseBugTemplate("Just a free paste from my AI notes.")
    assert.equal(parsed.matched, false)
    assert.equal(parsed.description, "Just a free paste from my AI notes.")
    assert.equal(parsed.steps, "")
    assert.equal(parsed.component, "")
  })

  it("tolerates empty optional sections", () => {
    const text = [
      "::: What happened, and what did you expect instead? :::",
      "Broken layout",
      "",
      "::: Steps to reproduce :::",
      "",
      "",
      "::: What's this about? :::",
      "Roundel",
    ].join("\n")
    const parsed = parseBugTemplate(text)
    assert.equal(parsed.matched, true)
    assert.equal(parsed.description, "Broken layout")
    assert.equal(parsed.steps, "")
    assert.equal(parsed.component, "Roundel")
  })

  it("survives toggling form → note → form", () => {
    const once = buildBugTemplate("A", "B", "Introduction")
    const mid = parseBugTemplate(once)
    const twice = buildBugTemplate(mid.description, mid.steps, mid.component)
    const again = parseBugTemplate(twice)
    assert.deepEqual(again, {
      description: "A",
      steps: "B",
      component: "Introduction",
      matched: true,
    })
  })
})

describe("suggestComponentForPage", () => {
  it("matches catalog hrefs", () => {
    assert.equal(
      suggestComponentForPage("/docs", "Get started · x"),
      "Get started"
    )
    assert.equal(
      suggestComponentForPage("/docs/tube-rail-arrivals", "whatever"),
      "Tube & Rail Arrivals"
    )
  })

  it("falls back to title without site suffix", () => {
    assert.equal(
      suggestComponentForPage("/unknown", "Custom page · tfl-components"),
      "Custom page"
    )
  })
})

describe("FEEDBACK_ABOUT_OPTIONS", () => {
  it("leads with site-wide topics, then catalogue titles", () => {
    assert.deepEqual(
      FEEDBACK_ABOUT_OPTIONS.slice(0, FEEDBACK_ABOUT_TOPICS.length),
      [...FEEDBACK_ABOUT_TOPICS]
    )
    assert.ok(FEEDBACK_ABOUT_OPTIONS.includes("tfl-ts"))
    assert.ok(FEEDBACK_ABOUT_OPTIONS.includes("TfL API"))
    assert.ok(FEEDBACK_ABOUT_OPTIONS.includes("This website"))
    assert.ok(FEEDBACK_ABOUT_OPTIONS.includes("Tube & Rail Arrivals"))
  })
})

describe("parseBugTemplate aliases", () => {
  it("still reads the old component-or-page heading", () => {
    const text = [
      "::: What happened, and what did you expect instead? :::",
      "Broken layout",
      "",
      "::: Steps to reproduce :::",
      "",
      "",
      "::: Component or page affected :::",
      "Roundel",
    ].join("\n")
    const parsed = parseBugTemplate(text)
    assert.equal(parsed.matched, true)
    assert.equal(parsed.component, "Roundel")
  })
})
