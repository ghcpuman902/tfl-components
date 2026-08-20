import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { formatObservationAge } from "@/lib/tfl/observatory/format-age"

const now = new Date(2026, 7, 19, 15, 0, 0).getTime()

describe("formatObservationAge", () => {
  it("uses just now, minutes, and hours on the same local day", () => {
    assert.equal(formatObservationAge(now - 10_000, now, "en-GB"), "just now")
    assert.equal(
      formatObservationAge(
        new Date(2026, 7, 19, 14, 57).getTime(),
        now,
        "en-GB"
      ),
      "3m ago"
    )
    assert.equal(
      formatObservationAge(
        new Date(2026, 7, 19, 13, 0).getTime(),
        now,
        "en-GB"
      ),
      "2h ago"
    )
  })

  it("uses yesterday until the day before that", () => {
    assert.equal(
      formatObservationAge(
        new Date(2026, 7, 18, 14, 8).getTime(),
        now,
        "en-GB"
      ),
      "Yesterday 14:08"
    )
    assert.equal(
      formatObservationAge(
        new Date(2026, 7, 17, 14, 8).getTime(),
        now,
        "en-GB"
      ),
      "17 Aug 2026, 14:08"
    )
  })
})
