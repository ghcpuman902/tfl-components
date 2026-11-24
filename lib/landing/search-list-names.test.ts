import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  approximateStationMeasure,
  formatStationLabel,
} from "@/lib/tfl/station-typography"

// The search list fits names the way the Board's stop title does: one line,
// abbreviations allowed, no scale-down; when nothing fits, the row lets it wrap.
const listFit = (name: string, maxWidth: number) =>
  formatStationLabel(name, approximateStationMeasure, {
    maxWidth,
    fontSize: 18,
    maxLines: 1,
    allowAbbreviation: true,
    allowScaleDown: false,
  })

describe("search list names", () => {
  const name = "Blackhorse Rd Stn / Blackhorse Lane"
  const full = approximateStationMeasure(name, 18)

  it("keeps the full name when it fits", () => {
    const fit = listFit(name, full + 1)
    assert.equal(fit.abbreviated, false)
    assert.deepEqual(fit.lines, [name])
  })

  it("abbreviates before it would wrap", () => {
    const fit = listFit(name, full - 1)
    assert.equal(fit.fits, true)
    assert.equal(fit.abbreviated, true)
    assert.equal(fit.lines.length, 1)
  })

  it("never shrinks the type, so a name that still does not fit wraps instead", () => {
    const fit = listFit(name, 60)
    assert.equal(fit.fits, false)
    assert.equal(fit.scale, 1)
  })
})
