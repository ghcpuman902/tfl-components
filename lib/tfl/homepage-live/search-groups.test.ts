import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { StopRow } from "@/lib/tfl/stop-index"
import { groupSearchRows } from "@/lib/tfl/homepage-live/search-groups"

const bus = (id: string, name: string, letter: string, lines: string[]): StopRow => ({
  id,
  name,
  kind: "bus",
  letter,
  lines,
  modes: ["bus"],
})

describe("search view rows", () => {
  it("keeps the best match apart, clusters one place's stops, then lists each stop", () => {
    const station: StopRow = { id: "HUBBAN", name: "Bank", kind: "station", lines: ["central", "dlr"], modes: ["dlr", "tube"] }
    const { best, items, busCount } = groupSearchRows([
      station,
      { id: "HUBEMB", name: "Embankment", kind: "station", lines: ["district"], modes: ["tube"] },
      bus("1", "Bank Station / Cornhill", "E", ["25", "8"]),
      bus("2", "Bank Station", "K", ["25", "n21"]),
      bus("3", "Bank Station  / Poultry", "A", ["8", "21"]),
      bus("4", "Bank Station", "B", ["43"]),
    ])
    assert.equal(best, station)
    assert.equal(busCount, 4)
    assert.deepEqual(
      items.map((item) => (item.kind === "cluster" ? `${item.name}: ${item.letters} ${item.routes.join(",")}` : item.row.id)),
      ["Bank Station: A–K 8,21,25,43", "1", "2", "3", "4", "HUBEMB"]
    )
  })
})
