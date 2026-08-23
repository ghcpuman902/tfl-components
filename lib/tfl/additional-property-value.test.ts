import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  formatAdditionalPropertyDate,
  parseAdditionalPropertyValue,
} from "./additional-property-value"

describe("parseAdditionalPropertyValue", () => {
  it("treats empty and literal null as null", () => {
    assert.deepEqual(parseAdditionalPropertyValue(undefined), { kind: "null" })
    assert.deepEqual(parseAdditionalPropertyValue(""), { kind: "null" })
    assert.deepEqual(parseAdditionalPropertyValue("null"), { kind: "null" })
  })

  it("parses booleans from true/false and yes/no", () => {
    assert.deepEqual(parseAdditionalPropertyValue("true"), {
      kind: "boolean",
      value: true,
    })
    assert.deepEqual(parseAdditionalPropertyValue("no"), {
      kind: "boolean",
      value: false,
    })
  })

  it("parses counts and leaves zone composites as text", () => {
    assert.deepEqual(parseAdditionalPropertyValue("13"), {
      kind: "number",
      value: 13,
    })
    assert.deepEqual(parseAdditionalPropertyValue("1+2"), {
      kind: "text",
      value: "1+2",
    })
  })

  it("parses ISO and unix-ms dates", () => {
    assert.deepEqual(parseAdditionalPropertyValue("2010-07-12"), {
      kind: "date",
      ms: Date.UTC(2010, 6, 12),
      precision: "date",
    })
    assert.deepEqual(parseAdditionalPropertyValue("1278947280000"), {
      kind: "date",
      ms: 1278947280000,
      precision: "datetime",
    })
  })
})

describe("formatAdditionalPropertyDate", () => {
  it("formats a calendar day without a time", () => {
    assert.equal(
      formatAdditionalPropertyDate(Date.UTC(2010, 6, 12), "date"),
      "12 Jul 2010"
    )
  })

  it("formats an instant in Europe/London", () => {
    const label = formatAdditionalPropertyDate(
      Date.parse("2026-08-10T18:46:07.87Z"),
      "datetime"
    )
    assert.match(label, /10 Aug 2026/)
    assert.match(label, /19:46/)
  })
})
