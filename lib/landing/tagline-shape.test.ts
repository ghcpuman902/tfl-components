import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  checkText,
  classifyShape,
  enumerateBreakSets,
  evaluateBreaks,
  parseMarkedText,
  plainText,
  type Measure,
  type ShapeRules,
} from "@/lib/landing/tagline-shape"

/** One unit per character: widths are exact and font-free. */
const measure: Measure = (text) => text.length * 10

const rules: ShapeRules = {
  maxLines: 3,
  maxRatio: 2,
  balancedRatio: 1.25,
  equalTolerance: 0.08,
  fitShare: 1,
  preferredLines: [1, 3],
}

describe("marked text", () => {
  it("splits on spaces outside groups and keeps groups whole", () => {
    const chunks = parseMarkedText("Got {a spare screen}? It {could tell you}")
    assert.deepEqual(
      chunks.map((chunk) => chunk.text),
      ["Got", "a spare screen?", "It", "could tell you"]
    )
    assert.deepEqual(
      chunks.map((chunk) => chunk.wordCount),
      [1, 3, 1, 3]
    )
  })

  it("round-trips to plain text", () => {
    assert.equal(
      plainText("{Know when to leave.} Without {your phone.}"),
      "Know when to leave. Without your phone."
    )
  })

  it("rejects unbalanced, nested and empty groups", () => {
    assert.throws(() => parseMarkedText("{open"))
    assert.throws(() => parseMarkedText("close}"))
    assert.throws(() => parseMarkedText("{a {b}}"))
    assert.throws(() => parseMarkedText("{}"))
  })
})

describe("break sets", () => {
  it("enumerates every subset of the gaps up to the limit", () => {
    assert.deepEqual(enumerateBreakSets(1, 2), [[]])
    assert.deepEqual(enumerateBreakSets(3, 2), [[], [0], [0, 1], [1]])
    assert.equal(enumerateBreakSets(5, 2).length, 1 + 4 + 6)
  })
})

describe("shape classification", () => {
  const cls = (widths: number[]) => classifyShape(widths, rules)
  it("names the shapes", () => {
    assert.equal(cls([100]), "single")
    assert.equal(cls([100, 110]), "balanced")
    assert.equal(cls([200, 100]), "long-short")
    assert.equal(cls([100, 200]), "short-long")
    assert.equal(cls([200, 100, 200]), "long-short-long")
    assert.equal(cls([100, 105, 200]), "short-short-long")
    assert.equal(cls([200, 150, 100]), "long-short-short")
    assert.equal(cls([100, 200, 100]), "short-long-short")
    assert.equal(cls([100, 110, 105]), "balanced")
  })
})

describe("rules", () => {
  const chunks = (marked: string) => parseMarkedText(marked)

  it("rejects a runt: a long line followed by a very short one", () => {
    const layout = evaluateBreaks(
      chunks("{aaaaaaaaaaaaaaaaaaaa} {bbb}"),
      [0],
      1000,
      measure,
      rules
    )
    assert.ok(layout.reasons.includes("runt-ratio"))
    assert.ok(layout.reasons.includes("single-word-last-line"))
  })

  it("rejects a bulge (short, long, short)", () => {
    const layout = evaluateBreaks(
      chunks("{aaaa bbbb} {cccc dddd eeee ffff gggg} {hhhh iiii}"),
      [0, 1],
      1000,
      measure,
      { ...rules, maxRatio: 10 }
    )
    assert.equal(layout.shape, "short-long-short")
    assert.ok(layout.reasons.includes("bad-shape"))
  })

  it("rejects a line ending on an article, preposition or conjunction", () => {
    for (const lead of ["Know the", "Wait for", "Pick a stop and", "Call it"]) {
      const layout = evaluateBreaks(
        chunks(`${lead.split(" ").join(" ")} {rest of it here}`),
        [lead.split(" ").length - 1],
        1000,
        measure,
        { ...rules, maxRatio: 10 }
      )
      assert.ok(
        layout.reasons.includes("ends-with-function-word"),
        `${lead}: ${layout.reasons.join()}`
      )
    }
  })

  it("rejects a line wider than the container share", () => {
    const layout = evaluateBreaks(chunks("{aaaa bbbb}"), [], 50, measure, rules)
    assert.ok(layout.reasons.includes("line-overflow"))
  })

  it("never breaks inside a group", () => {
    const text = "{Know when to leave.} Without {picking up} {your phone.}"
    const chunkTexts = parseMarkedText(text).map((chunk) => chunk.text)
    for (const set of enumerateBreakSets(chunkTexts.length, 2)) {
      const layout = evaluateBreaks(
        parseMarkedText(text),
        set,
        500,
        measure,
        rules
      )
      const lines = layout.lines.map((line) => line.text)
      for (const phrase of [
        "Know when to leave.",
        "picking up",
        "your phone.",
      ]) {
        assert.ok(
          lines.some((line) => line.includes(phrase)),
          `${lines.join(" / ")} splits "${phrase}"`
        )
      }
    }
  })

  it("prefers the balanced break over a ragged one and is deterministic", () => {
    const text = "{aaaa bbbb cccc} {dddd eeee ffff}"
    const narrow = { ...rules, preferredLines: [2, 2] as const }
    const first = checkText(text, 200, measure, narrow)
    const second = checkText(text, 200, measure, narrow)
    assert.deepEqual([...first.chosen.breaks], [0])
    assert.deepEqual(first.chosen.breaks, second.chosen.breaks)
    assert.equal(first.pass, true)
  })

  it("reports failure with the closest layout and per-rule counts", () => {
    const result = checkText("{aaaa} {bbbb}", 30, measure, rules)
    assert.equal(result.pass, false)
    assert.ok((result.rejectedBy["line-overflow"] ?? 0) > 0)
    assert.ok(result.chosen.reasons.length > 0)
  })
})
