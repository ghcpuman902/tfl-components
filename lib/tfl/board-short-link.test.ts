import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { parseBoardConfig } from "@/lib/tfl/board-url-state"
import {
  decodeBoardShortSlug,
  encodeBoardShortSlug,
} from "@/lib/tfl/board-short-link"

const names: Record<string, string> = {
  "940GZZLUKSX": "King's Cross St. Pancras",
}
const lookup = (id: string) => names[id]

const KX_BIKES =
  "#stop=940GZZLUKSX&stopName=King%27s+Cross+St.+Pancras&p1=cycle,rail&p2=status&c.docks=BikePoints_14,BikePoints_439,BikePoints_593&key=secret123"

describe("board short link", () => {
  it("round-trips the full config, panel order and docks included, without the key", () => {
    const slug = encodeBoardShortSlug(parseBoardConfig(KX_BIKES), lookup)
    assert.ok(slug)
    assert.ok(slug.length < 40, `slug too long: ${slug.length}`)
    const decoded = decodeBoardShortSlug(slug, lookup)
    assert.ok(decoded)
    assert.deepEqual(decoded.config.slots.p1, ["cycle", "rail"])
    assert.deepEqual(decoded.config.cycle.docks, [
      "BikePoints_14",
      "BikePoints_439",
      "BikePoints_593",
    ])
    assert.equal(decoded.config.stopName, "King's Cross St. Pancras")
    assert.equal(decoded.config.key, undefined)
    assert.ok(!decoded.hash.includes("key="))
    assert.ok(!slug.includes("secret"))
  })

  it("gives one stable slug per Board", () => {
    const a = encodeBoardShortSlug(parseBoardConfig(KX_BIKES), lookup)
    const b = encodeBoardShortSlug(
      parseBoardConfig(KX_BIKES.replace("&key=secret123", "")),
      lookup
    )
    assert.equal(a, b)
  })

  it("keeps a custom stop name the index does not know", () => {
    const config = parseBoardConfig("#stop=940GZZLUKSX&stopName=Home")
    const decoded = decodeBoardShortSlug(
      encodeBoardShortSlug(config, lookup)!,
      lookup
    )
    assert.equal(decoded?.config.stopName, "Home")
  })

  it("rejects junk, other versions and non-canonical slugs", () => {
    const slug = encodeBoardShortSlug(parseBoardConfig(KX_BIKES), lookup)!
    for (const bad of [
      "",
      "1",
      "2" + slug.slice(1),
      slug + "A",
      "1!!!",
      "1" + btoa("key=x").replace(/=/g, ""),
      "x".repeat(700),
    ]) {
      assert.equal(decodeBoardShortSlug(bad, lookup), null, bad)
    }
  })

  it("needs a stop to share", () => {
    assert.equal(encodeBoardShortSlug(parseBoardConfig("#p1=cycle")), null)
  })
})
