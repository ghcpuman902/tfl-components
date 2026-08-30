import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  parseDocsStripQuery,
  writeDocsStripQuery,
} from "./docs-strip-query"

const VALID = new Set(["northern", "district", "victoria"])

describe("docs strip query", () => {
  it("reads a valid line and omits unknown flags", () => {
    const parsed = parseDocsStripQuery(
      "?line=district",
      VALID,
      "northern"
    )
    assert.equal(parsed.lineId, "district")
    assert.equal(parsed.mono, false)
    assert.equal(parsed.fit, false)
  })

  it("falls back when the line is missing or unknown", () => {
    assert.equal(
      parseDocsStripQuery("", VALID, "northern").lineId,
      "northern"
    )
    assert.equal(
      parseDocsStripQuery("?line=bakerloo", VALID, "northern").lineId,
      "northern"
    )
  })

  it("treats mono=1 and fit=1 as on", () => {
    const parsed = parseDocsStripQuery(
      "line=victoria&mono=1&fit=1",
      VALID,
      "northern"
    )
    assert.equal(parsed.lineId, "victoria")
    assert.equal(parsed.mono, true)
    assert.equal(parsed.fit, true)
  })

  it("writes line and only the flags that are in play", () => {
    assert.equal(
      writeDocsStripQuery("", { lineId: "district" }),
      "line=district"
    )
    assert.equal(
      writeDocsStripQuery("line=district", { lineId: "district" }),
      null
    )
    assert.equal(
      writeDocsStripQuery("line=district", {
        lineId: "district",
        mono: true,
        fit: true,
      }),
      "line=district&mono=1&fit=1"
    )
    assert.equal(
      writeDocsStripQuery("line=district&mono=1&fit=1", {
        lineId: "district",
        mono: false,
        fit: false,
      }),
      "line=district"
    )
  })

  it("leaves unused flags alone when they are not in the write", () => {
    assert.equal(
      writeDocsStripQuery("line=victoria&mono=1", { lineId: "jubilee" }),
      "line=jubilee&mono=1"
    )
  })
})
