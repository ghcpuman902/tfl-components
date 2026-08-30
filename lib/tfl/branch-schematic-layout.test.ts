import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildBranchSchematic,
  TOPOLOGY_CLIP_LINE_IDS as TOPOLOGY_CLIP_LINE_IDS_FOR_TEST,
} from "./branch-schematic-layout.ts"
import { NORTHERN_LINE_SCHEMATIC_HORIZONTAL } from "./fixtures/northern-line-schematic-horizontal.ts"
import { NORTHERN_LINE_SCHEMATIC_VERTICAL } from "./fixtures/northern-line-schematic-vertical.ts"
import { requiredGutterPos } from "./geometry/branch-strip-joins.ts"
import { validateSchematic, type LineSchematic } from "./line-schematic.ts"
import {
  buildLineTopologyFromStaticBranches,
  listBranchedLineIds,
} from "./line-topology.ts"

/**
 * Every edge touching a `"virtual"` join must clear `requiredGutterPos` on
 * the lane it changes — otherwise `octilinearLanePath` falls back to a 90°
 * stair instead of a 45° S (the exact bug the join-split pass exists to
 * avoid). Returns violation descriptions (empty = all clear).
 */
const virtualJoinClearanceViolations = (schematic: LineSchematic): string[] => {
  const byId = new Map(schematic.nodes.map((node) => [node.id, node]))
  const violations: string[] = []
  for (const edge of schematic.edges) {
    const from = byId.get(edge.from)
    const to = byId.get(edge.to)
    if (!from || !to) continue
    if (from.kind !== "virtual" && to.kind !== "virtual") continue
    if (from.lane === to.lane) continue
    const deltaPos = Math.abs(from.pos - to.pos)
    const deltaLane = Math.abs(from.lane - to.lane)
    const required = requiredGutterPos(deltaLane)
    if (deltaPos + 1e-6 < required) {
      violations.push(
        `${edge.from}→${edge.to}: Δpos=${deltaPos.toFixed(3)} < required ${required.toFixed(3)} for Δlane=${deltaLane}`
      )
    }
  }
  return violations
}

/**
 * Structural match vs a hand-authored schematic.
 *
 * For each station present in both (by `stationKey` / name):
 * (a) same side of the trunk — `sign(lane)` sets agree
 * (b) monotonic `pos` order along each hand-authored branch is preserved
 *
 * Score = agreeing stations / shared stations. Target ≥ 80% for Northern.
 */
const stationKeyOf = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC']/g, "")
    .trim()

export const structuralMatchScore = (
  generated: LineSchematic,
  authored: LineSchematic
): { score: number; shared: number; sideOk: number; orderOk: number } => {
  const authoredByKey = new Map<string, (typeof authored.nodes)[number][]>()
  for (const node of authored.nodes) {
    const key = stationKeyOf(node.stationKey ?? node.name)
    const list = authoredByKey.get(key) ?? []
    list.push(node)
    authoredByKey.set(key, list)
  }
  const generatedByKey = new Map<string, (typeof generated.nodes)[number][]>()
  for (const node of generated.nodes) {
    const key = stationKeyOf(node.stationKey ?? node.name)
    const list = generatedByKey.get(key) ?? []
    list.push(node)
    generatedByKey.set(key, list)
  }

  const sharedKeys = [...authoredByKey.keys()].filter((key) =>
    generatedByKey.has(key)
  )
  let sideOk = 0
  for (const key of sharedKeys) {
    const authoredSigns = new Set(
      authoredByKey.get(key)!.map((node) => Math.sign(node.lane))
    )
    const generatedSigns = new Set(
      generatedByKey.get(key)!.map((node) => Math.sign(node.lane))
    )
    const agree =
      [...authoredSigns].every((sign) => generatedSigns.has(sign)) &&
      [...generatedSigns].every((sign) => authoredSigns.has(sign))
    if (agree) sideOk += 1
  }

  const authoredBranches = new Map<string, (typeof authored.nodes)[number][]>()
  for (const node of authored.nodes) {
    for (const branchId of node.branchIds ?? []) {
      const list = authoredBranches.get(branchId) ?? []
      list.push(node)
      authoredBranches.set(branchId, list)
    }
  }
  let orderPairs = 0
  let orderOk = 0
  for (const list of authoredBranches.values()) {
    const sorted = [...list].sort((a, b) => a.pos - b.pos)
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const a = stationKeyOf(sorted[i]!.stationKey ?? sorted[i]!.name)
      const b = stationKeyOf(sorted[i + 1]!.stationKey ?? sorted[i + 1]!.name)
      const ga = generatedByKey.get(a)?.[0]
      const gb = generatedByKey.get(b)?.[0]
      if (!ga || !gb) continue
      orderPairs += 1
      if (ga.pos <= gb.pos) orderOk += 1
    }
  }

  const orderRatio = orderPairs === 0 ? 1 : orderOk / orderPairs
  const sideRatio = sharedKeys.length === 0 ? 1 : sideOk / sharedKeys.length
  const score = (sideRatio + orderRatio) / 2

  return {
    score,
    shared: sharedKeys.length,
    sideOk,
    orderOk,
  }
}

describe("buildLineTopologyFromStaticBranches", () => {
  it("reads Northern inbound Regular segments without a network call", () => {
    const topology = buildLineTopologyFromStaticBranches("northern")
    assert.ok(topology)
    assert.equal(topology.lineId, "northern")
    assert.ok((topology.trunkStationIds?.length ?? 0) >= 30)
    assert.ok(topology.edges.length > 40)
    assert.ok(topology.stationNames?.["940GZZLUHBT"]?.includes("High Barnet"))
  })
})

describe("computeBranchSchematicLayout", () => {
  // Northern's horizontal strip no longer comes from this trunk-and-offshoot
  // walk at all — see `TOPOLOGY_CLIP_LINE_IDS` — so comparing it against the
  // hand-authored fixture (still drawn with a "longest Regular route is the
  // trunk" assumption) no longer means what it used to. The equivalent
  // invariant checks for the topology pipeline live in
  // `branch-strip-from-topology.test.ts`.

  it("builds a distinct vertical Northern map (not a rotated horizontal)", () => {
    const horizontal = buildBranchSchematic("northern", "horizontal")
    const vertical = buildBranchSchematic("northern", "vertical")
    assert.ok(horizontal)
    assert.ok(vertical)
    assert.equal(vertical.orientation, "vertical")
    const match = structuralMatchScore(
      vertical,
      NORTHERN_LINE_SCHEMATIC_VERTICAL
    )
    assert.ok(match.shared > 0)
    const sameLanes = horizontal.nodes.every((node) => {
      const other = vertical.nodes.find((candidate) => candidate.id === node.id)
      return other != null && other.lane === node.lane
    })
    assert.equal(
      sameLanes,
      false,
      "vertical branch-to-lane map must differ from horizontal"
    )
  })

  it("keeps the longest branch on lane 0 and validates every branched line", () => {
    for (const orientation of ["horizontal", "vertical"] as const) {
      for (const lineId of listBranchedLineIds()) {
        const schematic = buildBranchSchematic(lineId, orientation)
        assert.ok(schematic, `expected ${orientation} schematic for ${lineId}`)
        assert.equal(schematic.orientation, orientation)
        const issues = validateSchematic(schematic)
        assert.deepEqual(
          issues,
          [],
          `${lineId} ${orientation}: ${issues.map((i) => i.message).join("; ")}`
        )
        if (lineId === "circle") continue
        // Northern / District / Metropolitan horizontal strips come from
        // the topology clip instead: lane 0 is whichever RUN sits closest
        // to the energy layout's own main axis, not necessarily the
        // longest branch — see `branch-strip-from-topology.ts`.
        if (
          orientation === "horizontal" &&
          TOPOLOGY_CLIP_LINE_IDS_FOR_TEST.has(lineId)
        ) {
          continue
        }
        const lane0 = schematic.nodes.filter((node) => node.lane === 0)
        const byLane = new Map<number, number>()
        for (const node of schematic.nodes) {
          byLane.set(node.lane, (byLane.get(node.lane) ?? 0) + 1)
        }
        const maxLaneCount = Math.max(...byLane.values())
        assert.ok(
          lane0.length === maxLaneCount,
          `${lineId} ${orientation}: longest lane should be 0 (lane0=${lane0.length}, max=${maxLaneCount})`
        )
      }
    }
  })

  it("gives every virtual join enough Δpos for a 45° S, never a 90° stair", () => {
    for (const lineId of listBranchedLineIds()) {
      const schematic = buildBranchSchematic(lineId, "horizontal")
      assert.ok(schematic, `expected a horizontal schematic for ${lineId}`)
      const violations = virtualJoinClearanceViolations(schematic)
      assert.deepEqual(violations, [], `${lineId}: ${violations.join("; ")}`)
    }
    const northernViolations = virtualJoinClearanceViolations(
      NORTHERN_LINE_SCHEMATIC_HORIZONTAL
    )
    assert.deepEqual(northernViolations, [], northernViolations.join("; "))
  })

  it("keeps DLR Star Lane on a lane next to Canning Town", () => {
    const schematic = buildBranchSchematic("dlr", "horizontal")
    assert.ok(schematic)
    const star = schematic.nodes.find(
      (node) => stationKeyOf(node.stationKey ?? node.name) === "star-lane"
    )
    const canning = schematic.nodes.find(
      (node) => stationKeyOf(node.stationKey ?? node.name) === "canning-town"
    )
    assert.ok(star)
    assert.ok(canning)
    assert.ok(
      Math.abs(star.lane - canning.lane) <= 1,
      `Star Lane lane ${star.lane} should sit next to Canning Town lane ${canning.lane}`
    )
    assert.ok(
      Math.abs(star.pos - canning.pos) <= 2,
      `Star Lane pos ${star.pos} should sit next to Canning Town pos ${canning.pos}`
    )
  })

  it("keeps one Stratford on DLR (it joins, it is not Euston)", () => {
    const schematic = buildBranchSchematic("dlr", "horizontal")
    assert.ok(schematic)
    const stratford = schematic.nodes.filter(
      (node) => stationKeyOf(node.stationKey ?? node.name) === "stratford"
    )
    assert.equal(
      stratford.length,
      1,
      `Stratford nodes: ${stratford.map((n) => `${n.id}@${n.lane}`).join(",")}`
    )
  })

  it("splits Poplar into two blobs — Blackwall↔Westferry never through-runs to All Saints↔West India Quay", () => {
    const schematic = buildBranchSchematic("dlr", "horizontal")
    assert.ok(schematic)
    const poplar = schematic.nodes.filter(
      (node) => stationKeyOf(node.stationKey ?? node.name) === "poplar"
    )
    // Real DLR ordered routes confirm two independent through-pairs at
    // Poplar with no confirmed movement between them — the join-split pass
    // (`lib/tfl/geometry/branch-strip-joins.ts`) reads that the same way it
    // already reads Northern Euston: two blobs, same `stationKey`.
    assert.equal(
      poplar.length,
      2,
      `Poplar nodes: ${poplar.map((n) => `${n.id}@${n.lane}`).join(",")}`
    )
    assert.ok(poplar.every((node) => node.stationKey === "poplar"))
    const degree = new Map<string, number>()
    for (const edge of schematic.edges) {
      degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1)
      degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1)
    }
    for (const node of poplar) {
      assert.ok(
        (degree.get(node.id) ?? 0) <= 3,
        `${node.id} degree ${degree.get(node.id)} should be ≤ 3`
      )
    }
  })

  it("draws Circle as a racetrack with a Hammersmith spur, not an unrolled sausage", () => {
    const schematic = buildBranchSchematic("circle", "horizontal")
    assert.ok(schematic)
    const lanes = new Set(schematic.nodes.map((node) => node.lane))
    assert.ok(lanes.size >= 2, "Circle loop needs at least two lanes")
    const edgware = schematic.nodes.filter((node) =>
      stationKeyOf(node.stationKey ?? node.name).startsWith("edgware-road")
    )
    assert.equal(
      edgware.length,
      1,
      "one Edgware Road, not a cut-and-unroll pair"
    )
    const hammersmith = schematic.nodes.find((node) =>
      stationKeyOf(node.stationKey ?? node.name).startsWith("hammersmith")
    )
    const bakerStreet = schematic.nodes.find((node) =>
      stationKeyOf(node.stationKey ?? node.name).startsWith("baker-street")
    )
    assert.ok(hammersmith)
    assert.ok(bakerStreet)
    assert.notEqual(
      hammersmith.lane,
      bakerStreet.lane,
      "Hammersmith spur is not on the same lane as the loop"
    )
  })

  it("duplicates Euston on Northern (parallel Bank / Charing Cross corridors)", () => {
    const generated = buildBranchSchematic("northern", "horizontal")
    assert.ok(generated)
    const eustons = generated.nodes.filter(
      (node) => stationKeyOf(node.stationKey ?? node.name) === "euston"
    )
    assert.equal(eustons.length, 2)
    const lanes = new Set(eustons.map((node) => node.lane))
    assert.equal(lanes.size, 2)
  })

  it("Elizabeth collapses London Paddington and London Liverpool Street into one station each", () => {
    const schematic = buildBranchSchematic("elizabeth", "horizontal")
    assert.ok(schematic)
    const paddingtons = schematic.nodes.filter((node) =>
      /paddington/i.test(node.name)
    )
    const liverpools = schematic.nodes.filter((node) =>
      /liverpool/i.test(node.name)
    )
    assert.equal(
      paddingtons.length,
      1,
      `Paddington nodes: ${paddingtons.map((node) => `${node.name}@${node.lane}`).join(", ")}`
    )
    assert.equal(
      liverpools.length,
      1,
      `Liverpool Street nodes: ${liverpools.map((node) => `${node.name}@${node.lane}`).join(", ")}`
    )
    assert.equal(paddingtons[0]?.name, "Paddington")
    assert.equal(liverpools[0]?.name, "Liverpool Street")
  })

  it("keeps the Central Hainault loop on one side of the Epping trunk", () => {
    const schematic = buildBranchSchematic("central", "horizontal")
    assert.ok(schematic)
    const byKey = (key: string) =>
      schematic.nodes.find(
        (node) => stationKeyOf(node.stationKey ?? node.name) === key
      )
    const epping = byKey("epping")
    const leytonstone = byKey("leytonstone")
    const woodford = byKey("woodford")
    const wanstead = byKey("wanstead")
    const hainault = byKey("hainault")
    const roding = byKey("roding-valley")
    assert.ok(epping && leytonstone && woodford && wanstead && hainault && roding)
    assert.equal(epping.lane, 0)
    assert.equal(leytonstone.lane, 0)
    assert.equal(woodford.lane, 0)
    assert.notEqual(wanstead.lane, 0)
    assert.notEqual(hainault.lane, 0)
    assert.notEqual(roding.lane, 0)
    assert.equal(Math.sign(wanstead.lane), Math.sign(roding.lane))
    assert.equal(Math.sign(hainault.lane), Math.sign(wanstead.lane))
    assert.ok(
      wanstead.pos >= leytonstone.pos,
      "Hainault via Wanstead peels east of Leytonstone, not back toward Stratford"
    )
    assert.ok(
      roding.pos >= woodford.pos,
      "Roding Valley sits east of Woodford on the loop, not back toward Leytonstone"
    )
    assert.equal(
      schematic.nodes.filter(
        (node) => stationKeyOf(node.stationKey ?? node.name) === "hainault"
      ).length,
      1
    )
  })

  it("RB6 keeps one Battersea Power Station Pier (short-working is not a second spur)", () => {
    const schematic = buildBranchSchematic("rb6", "horizontal")
    assert.ok(schematic)
    const batterseas = schematic.nodes.filter((node) =>
      /battersea power station/i.test(node.name)
    )
    assert.equal(
      batterseas.length,
      1,
      `Battersea nodes: ${batterseas.map((node) => `${node.id}@${node.lane},${node.pos}`).join(", ")}`
    )
  })

  it("Windrush Crystal Palace peels beside Sydenham without crossing Clapham", () => {
    const schematic = buildBranchSchematic("windrush", "horizontal")
    assert.ok(schematic)
    const byKey = (key: string) =>
      schematic.nodes.find(
        (node) => stationKeyOf(node.stationKey ?? node.name) === key
      )
    const sydenham = byKey("sydenham")
    const crystal = byKey("crystal-palace")
    const wandsworth = byKey("wandsworth-road")
    const newCross = schematic.nodes.find((node) =>
      stationKeyOf(node.stationKey ?? node.name).startsWith("new-cross")
    )
    assert.ok(sydenham && crystal && wandsworth && newCross)
    assert.equal(
      Math.abs(crystal.lane - sydenham.lane),
      1,
      `Crystal Palace should be one lane from Sydenham, not a 90° jump (L${crystal.lane} vs L${sydenham.lane})`
    )
    assert.equal(
      Math.sign(crystal.lane - sydenham.lane),
      Math.sign(newCross.lane - sydenham.lane) || Math.sign(crystal.lane),
      "Crystal Palace sits on the New Cross side, not through the Clapham corridor"
    )
    const lo = Math.min(sydenham.lane, crystal.lane)
    const hi = Math.max(sydenham.lane, crystal.lane)
    assert.ok(
      wandsworth.lane <= lo || wandsworth.lane >= hi,
      `Crystal Palace L${crystal.lane}→Sydenham L${sydenham.lane} must not cross Wandsworth Road L${wandsworth.lane}`
    )
  })

  it("keeps DLR Stratford High Street next to Stratford, not in the Westferry column", () => {
    const schematic = buildBranchSchematic("dlr", "horizontal")
    assert.ok(schematic)
    const byKey = (key: string) =>
      schematic.nodes.find(
        (node) => stationKeyOf(node.stationKey ?? node.name) === key
      )
    const shs = byKey("stratford-high-street")
    const abbey = byKey("abbey-road")
    const stratford = byKey("stratford")
    const westferry = byKey("westferry")
    assert.ok(shs && abbey && stratford && westferry)
    assert.notEqual(
      shs.pos,
      westferry.pos,
      "Stratford High Street must not sit in the Westferry / Poplar column"
    )
    assert.ok(
      Math.abs(shs.pos - stratford.pos) < Math.abs(shs.pos - westferry.pos),
      `SHS pos ${shs.pos} should sit nearer Stratford ${stratford.pos} than Westferry ${westferry.pos}`
    )
    assert.equal(
      shs.lane,
      abbey.lane,
      "Stratford High Street and Abbey Road stay on one corridor"
    )
  })

  it("keeps the DLR Poplar–Westferry bond to one lane", () => {
    const schematic = buildBranchSchematic("dlr", "horizontal")
    assert.ok(schematic)
    const westferry = schematic.nodes.find(
      (node) => stationKeyOf(node.stationKey ?? node.name) === "westferry"
    )
    assert.ok(westferry)
    const neighborIds = new Set<string>()
    for (const edge of schematic.edges) {
      if (edge.from === westferry.id) neighborIds.add(edge.to)
      if (edge.to === westferry.id) neighborIds.add(edge.from)
    }
    const poplar = schematic.nodes.filter(
      (node) =>
        neighborIds.has(node.id) &&
        stationKeyOf(node.stationKey ?? node.name) === "poplar"
    )
    assert.equal(poplar.length, 1, "Westferry should touch exactly one Poplar blob")
    assert.ok(
      Math.abs(poplar[0]!.lane - westferry.lane) <= 1,
      `Poplar L${poplar[0]!.lane} → Westferry L${westferry.lane} should be a one-lane bond, not a trunk-spanning vertical`
    )
  })

  it("DLR puts Canary Wharf → Westferry → Limehouse under All Saints", () => {
    const schematic = buildBranchSchematic("dlr", "horizontal")
    assert.ok(schematic)
    const byKey = (key: string) =>
      schematic.nodes.find(
        (node) => stationKeyOf(node.stationKey ?? node.name) === key
      )
    const allSaints = byKey("all-saints")
    const westferry = byKey("westferry")
    const limehouse = byKey("limehouse")
    const wiq = byKey("west-india-quay")
    const canary = byKey("canary-wharf")
    assert.ok(allSaints && westferry && limehouse && wiq && canary)
    assert.ok(
      westferry.lane > allSaints.lane,
      `Westferry L${westferry.lane} should sit below All Saints L${allSaints.lane}`
    )
    assert.equal(westferry.lane, limehouse.lane)
    assert.ok(
      canary.lane >= allSaints.lane,
      `Canary Wharf L${canary.lane} should not sit above All Saints L${allSaints.lane}`
    )
    assert.ok(
      wiq.lane >= allSaints.lane,
      `West India Quay L${wiq.lane} should not sit above All Saints L${allSaints.lane}`
    )
    const bank = byKey("bank")
    const tower = byKey("tower-gateway")
    assert.ok(bank && tower)
    assert.ok(
      bank.lane >= westferry.lane,
      `Bank L${bank.lane} should peel down from Westferry L${westferry.lane}`
    )
    assert.ok(
      tower.lane >= westferry.lane,
      `Tower Gateway L${tower.lane} should peel down from Westferry L${westferry.lane}`
    )
  })
})
