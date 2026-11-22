import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { RealtimePrediction } from "tfl-ts"
import {
  chooseHomepageRoute,
  evidenceOnRoute,
} from "@/lib/tfl/homepage-live/choose-route"
import { trainRoutes } from "@/lib/tfl/rail-train-tracker"
import { hopGraphForRailLine } from "@/lib/tfl/vehicle-hop-graph"

const HIGH_BARNET = "940GZZLUHBT"
const TOTTERIDGE = "940GZZLUTAW"
const canon = hopGraphForRailLine("northern").canonical
const NOW = Date.parse("2026-11-13T06:45:00Z")

const row = (
  naptanId: string,
  secondsAway: number,
  extra: Partial<RealtimePrediction> = {}
): RealtimePrediction =>
  ({
    lineId: "northern",
    vehicleId: "054",
    naptanId,
    destinationNaptanId: HIGH_BARNET,
    timeToStation: secondsAway,
    expectedArrival: new Date(NOW + secondsAway * 1000).toISOString(),
    timestamp: new Date(NOW).toISOString(),
    ...extra,
  }) as RealtimePrediction

describe("Between A and B", () => {
  const southbound = trainRoutes("northern").find(
    (r) => canon(r.stations[0]!) === HIGH_BARNET
  )!

  it("names the two neighbours, not the direction, so the later station on the route is the one ahead", () => {
    const evidence = evidenceOnRoute(
      southbound,
      { kind: "between", from: HIGH_BARNET, to: TOTTERIDGE },
      canon
    )
    assert.equal(evidence?.to, TOTTERIDGE)
    const reversed = evidenceOnRoute(
      southbound,
      { kind: "between", from: TOTTERIDGE, to: HIGH_BARNET },
      canon
    )
    assert.deepEqual(reversed, evidence)
  })

  it("drops evidence for two stations that are not neighbours on the route", () => {
    const far = southbound.stations[5]!
    assert.equal(
      evidenceOnRoute(
        southbound,
        { kind: "between", from: HIGH_BARNET, to: far },
        canon
      ),
      undefined
    )
  })

  it("puts a train arriving at High Barnet on the route that ends there", () => {
    const chosen = chooseHomepageRoute({
      lineId: "northern",
      rows: [row(HIGH_BARNET, 71)],
      evidence: { kind: "between", from: HIGH_BARNET, to: TOTTERIDGE },
      receivedAt: NOW,
    })
    assert.equal(canon(chosen!.route.stations.at(-1)!), HIGH_BARNET)
  })
})

describe("route stickiness", () => {
  it("keeps last poll's route while the rows still fit it", () => {
    const routes = trainRoutes("northern").filter(
      (r) => r.stations.length > 20 && r.direction === "inbound"
    )
    assert.ok(routes.length >= 2)
    const previous = routes[1]!
    const shared = previous.stations.slice(2, 5)
    const chosen = chooseHomepageRoute({
      lineId: "northern",
      rows: shared.map((id, i) => row(id, 60 + i * 90, { destinationNaptanId: undefined })),
      previous,
      receivedAt: NOW,
    })
    assert.equal(chosen!.route.id, previous.id)
  })
})
