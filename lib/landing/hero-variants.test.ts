import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { HERO_CANDIDATES } from "@/lib/landing/hero-candidates"
import { HERO_VARIANT_IDS } from "@/lib/landing/hero-experiment"
import {
  HERO_RESERVED_LINES,
  HERO_VARIANTS,
  heroHeadlineText,
  heroSublineText,
} from "@/lib/landing/hero-variants"
import { SITE_TAGLINE } from "@/lib/site"
import {
  experimentCandidates,
  runTaglineGate,
} from "@/lib/landing/tagline-gate"
import { HERO_BREAKPOINTS } from "@/lib/landing/hero-type"

const results = runTaglineGate()

describe("tagline gate on the hero candidates", () => {
  it("drafts 6 to 10 candidates including the brief's a, b and c", () => {
    assert.ok(HERO_CANDIDATES.length >= 6 && HERO_CANDIDATES.length <= 10)
    for (const id of ["a", "b", "c"]) {
      assert.ok(
        HERO_CANDIDATES.some((candidate) => candidate.id === id),
        id
      )
    }
  })

  it("passes at least two candidates, so there is a test to run", () => {
    assert.ok(experimentCandidates(results).length >= 2)
  })

  it("runs exactly the gate-passing candidates in the experiment", () => {
    const passing = experimentCandidates(results).map(
      (result) => result.candidate.id
    )
    assert.deepEqual([...HERO_VARIANT_IDS], passing)
  })

  it("keeps the chosen breaks in hero-variants.ts equal to the gate's choice", () => {
    for (const result of experimentCandidates(results)) {
      const id = result.candidate.id as (typeof HERO_VARIANT_IDS)[number]
      const variant = HERO_VARIANTS[id]
      for (const breakpoint of result.breakpoints) {
        assert.deepEqual(
          [...variant.headlineBreaks[breakpoint.id]],
          [...breakpoint.headline.chosen.breaks],
          `${id} headline ${breakpoint.id}`
        )
        assert.deepEqual(
          [...variant.sublineBreaks[breakpoint.id]],
          [...breakpoint.subline.chosen.breaks],
          `${id} subline ${breakpoint.id}`
        )
      }
    }
  })

  it("passes every rule at 390, 768 and 1440 for every variant", () => {
    for (const result of experimentCandidates(results)) {
      assert.equal(result.breakpoints.length, HERO_BREAKPOINTS.length)
      for (const breakpoint of result.breakpoints) {
        assert.equal(breakpoint.headline.pass, true)
        assert.equal(breakpoint.subline.pass, true)
        assert.deepEqual(breakpoint.headline.chosen.reasons, [])
        assert.deepEqual(breakpoint.subline.chosen.reasons, [])
      }
    }
  })

  it("keeps at most 3 variants and reserves the tallest one's lines", () => {
    assert.ok(HERO_VARIANT_IDS.length <= 3)
    assert.deepEqual(HERO_RESERVED_LINES.headline, { sm: 3, md: 2, lg: 2 })
    assert.deepEqual(HERO_RESERVED_LINES.subline, { sm: 3, md: 2, lg: 2 })
  })
})

describe("hero copy", () => {
  it("names the 77, which the hero scene shows, not the 38", () => {
    assert.match(heroHeadlineText("c"), /the 77 is coming/)
    assert.doesNotMatch(heroHeadlineText("c"), /38/)
  })

  it("keeps the brief's wording for a and b", () => {
    assert.equal(
      heroHeadlineText("a"),
      "Know when to leave. Without picking up your phone."
    )
    assert.equal(
      heroSublineText("a"),
      "Live buses, trains and Tube status on a screen by the door."
    )
    assert.equal(heroHeadlineText("b"), "The bus board for your hallway.")
  })

  it("feeds the control headline to site metadata", () => {
    assert.equal(SITE_TAGLINE, heroHeadlineText("a"))
  })

  it("uses British English and keeps About for the global page", () => {
    for (const id of HERO_VARIANT_IDS) {
      const text = `${heroHeadlineText(id)} ${heroSublineText(id)}`
      assert.doesNotMatch(text, /\bAbout\b|\bcolor\b|\bmeter\b/i)
    }
  })
})
