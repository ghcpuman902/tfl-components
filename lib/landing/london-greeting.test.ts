import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { greetingForLondonHour, londonHour } from "./london-greeting"

describe("London landing greeting", () => {
  it("buckets hours in Europe/London wall time", () => {
    assert.equal(greetingForLondonHour(5), "Good morning")
    assert.equal(greetingForLondonHour(11), "Good morning")
    assert.equal(greetingForLondonHour(12), "Good afternoon")
    assert.equal(greetingForLondonHour(16), "Good afternoon")
    assert.equal(greetingForLondonHour(17), "Good evening")
    assert.equal(greetingForLondonHour(21), "Good evening")
    assert.equal(greetingForLondonHour(22), "Good night")
    assert.equal(greetingForLondonHour(4), "Good night")
  })

  it("reads the hour in Europe/London, not the host timezone", () => {
    const noonUtc = new Date("2026-01-15T12:00:00.000Z")
    assert.equal(londonHour(noonUtc), 12)
  })
})
