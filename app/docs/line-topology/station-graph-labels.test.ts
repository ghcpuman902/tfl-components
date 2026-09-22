import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  assignLabelSides,
  layoutStationLabels,
  type GraphLabelNode,
} from "./station-graph-labels"
import { zoomAboutOrigin, zoomAround } from "./station-graph-scale"

const chain = (count: number, text = "Station Name"): GraphLabelNode[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `n${index}`,
    x: index * 80,
    y: 0,
    text: `${text} ${index}`,
    kind: index === 0 || index === count - 1 ? "terminus" : "station",
    degree: index === 0 || index === count - 1 ? 1 : 2,
    neighborIds: [
      ...(index > 0 ? [`n${index - 1}`] : []),
      ...(index < count - 1 ? [`n${index + 1}`] : []),
    ],
  }))

describe("assignLabelSides", () => {
  it("alternates up and down along a corridor", () => {
    const sides = assignLabelSides(chain(5))
    assert.equal(sides.get("n0"), "up")
    assert.equal(sides.get("n1"), "down")
    assert.equal(sides.get("n2"), "up")
    assert.equal(sides.get("n3"), "down")
    assert.equal(sides.get("n4"), "up")
  })
})

describe("layoutStationLabels", () => {
  it("keeps every named station visible", () => {
    const placed = layoutStationLabels(chain(9), { scale: 1 })
    assert.equal(
      placed.filter((label) => label.visible).length,
      9
    )
  })

  it("wraps a long name onto two lines by default", () => {
    const placed = layoutStationLabels(
      [
        {
          id: "south",
          x: 0,
          y: 0,
          text: "South Kensington",
          kind: "station",
          degree: 2,
          neighborIds: [],
        },
      ],
      { scale: 1 }
    )
    assert.deepEqual(placed[0]?.lines, ["South", "Kensington"])
    assert.equal(placed[0]?.visible, true)
  })

  it("abbreviates a long single token when the wrap cap is tight", () => {
    const placed = layoutStationLabels(
      [
        {
          id: "heathrow",
          x: 0,
          y: 0,
          text: "Heathrow Terminal 5",
          kind: "terminus",
          degree: 1,
          neighborIds: [],
        },
      ],
      { scale: 0.75 }
    )
    assert.ok((placed[0]?.lines.length ?? 0) >= 1)
    assert.ok((placed[0]?.lines.length ?? 0) <= 2)
    assert.equal(placed[0]?.visible, true)
  })
})

describe("zoomAround", () => {
  it("rejects non-finite scale instead of producing NaN", () => {
    const next = zoomAround({ scale: 1, x: 0, y: 0 }, Number.NaN, {
      x: 10,
      y: 20,
    })
    assert.equal(next.scale, 1)
    assert.equal(next.x, 0)
    assert.equal(next.y, 0)
    assert.ok(Number.isFinite(next.x) && Number.isFinite(next.y))
  })

  it("recenters when zooming out about the origin to 1", () => {
    const next = zoomAboutOrigin({ scale: 3, x: 40, y: -12 }, 1)
    assert.equal(next.scale, 1)
    assert.equal(next.x, 0)
    assert.equal(next.y, 0)
  })
})
