import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { getStationCatalog } from "./station-catalog.ts"
import {
  foldStationSearchText,
  stationNameMatchesQuery,
  stationSearchAliasForms,
} from "./station-name-match.ts"

const catalogNames = () =>
  getStationCatalog().map((station) => station.displayName)

const hits = (query: string): string[] =>
  catalogNames().filter((name) => stationNameMatchesQuery(name, query))

const has = (query: string, expected: string) => {
  assert.ok(
    hits(query).includes(expected),
    `expected "${query}" to match ${expected}, got ${JSON.stringify(hits(query).slice(0, 8))}`
  )
}

describe("foldStationSearchText", () => {
  it("strips apostrophes and turns other punctuation into spaces", () => {
    assert.equal(
      foldStationSearchText("King's Cross St. Pancras"),
      "kings cross st pancras"
    )
    assert.equal(
      foldStationSearchText("Harrow-on-the-Hill"),
      "harrow on the hill"
    )
    assert.equal(
      foldStationSearchText("Elephant & Castle"),
      "elephant and castle"
    )
    assert.equal(foldStationSearchText("St. Paul's"), "st pauls")
  })
})

describe("stationNameMatchesQuery", () => {
  it("matches every catalogue name against its own folded text", () => {
    for (const name of catalogNames()) {
      assert.equal(
        stationNameMatchesQuery(name, foldStationSearchText(name)),
        true
      )
    }
  })

  it("matches King's Cross without the apostrophe or the period", () => {
    has("kings cross", "King's Cross St. Pancras")
    has("st pancras", "King's Cross St. Pancras")
    has("kings cross st pancras", "King's Cross St. Pancras")
  })

  it("matches St. Pancras when Saint is typed in full", () => {
    has("saint pancras", "King's Cross St. Pancras")
    has("saint pauls", "St. Paul's")
    has("saint james", "St. James's Park")
    has("saint johns", "St. John's Wood")
  })

  it("does not treat Street stations as Saint", () => {
    assert.ok(!hits("saint").includes("Baker Street"))
    assert.ok(!hits("saint").includes("Liverpool Street"))
    assert.deepEqual(
      hits("saint").sort(),
      [
        "All Saints",
        "King's Cross St. Pancras",
        "St James Street",
        "St. James's Park",
        "St. John's Wood",
        "St. Paul's",
      ].sort()
    )
  })

  it("matches Street names from St and from Street", () => {
    has("liverpool st", "Liverpool Street")
    has("liverpool street", "Liverpool Street")
    has("baker st", "Baker Street")
  })

  it("matches diagram abbreviations that are not prefixes of the full word", () => {
    has("finchley rd", "Finchley Road")
    has("belsize pk", "Belsize Park")
    has("chancery ln", "Chancery Lane")
    has("clapham jct", "Clapham Junction")
    has("hackney ctrl", "Hackney Central")
  })

  it("matches apostrophe, hyphen, ampersand, and parenthesis names", () => {
    has("earls court", "Earl's Court")
    has("queens park", "Queen's Park")
    has("shepherds bush", "Shepherd's Bush")
    has("harrow on the hill", "Harrow-on-the-Hill")
    has("bromley by bow", "Bromley-by-Bow")
    has("elephant and castle", "Elephant & Castle")
    has("excel", "Custom House (for ExCel)")
  })

  it("returns every station for an empty or punctuation-only query", () => {
    assert.equal(stationNameMatchesQuery("Oxford Circus", "  "), true)
    assert.equal(stationNameMatchesQuery("Oxford Circus", "???"), true)
  })
})

describe("stationSearchAliasForms", () => {
  it("exposes apostrophe-free and period-free King's Cross forms", () => {
    const aliases = stationSearchAliasForms("King's Cross St. Pancras")
    assert.ok(aliases.includes("Kings Cross St. Pancras"))
    assert.ok(aliases.includes("Kings Cross St Pancras"))
    assert.ok(aliases.includes("King's Cross Saint Pancras"))
  })

  it("exposes Saint and punctuation-soft St. Paul's", () => {
    const aliases = stationSearchAliasForms("St. Paul's")
    assert.ok(aliases.includes("Saint Paul's"))
    assert.ok(aliases.includes("St Pauls"))
    assert.ok(aliases.includes("Saint Pauls"))
  })

  it("exposes hyphen-soft and abbreviated diagram forms", () => {
    const hill = stationSearchAliasForms("Harrow-on-the-Hill")
    assert.ok(hill.includes("Harrow on the Hill"))
    const road = stationSearchAliasForms("Finchley Road")
    assert.ok(road.includes("Finchley Rd"))
  })
})
