import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBranchSchematic } from "./branch-schematic-layout.ts";
import { NORTHERN_LINE_SCHEMATIC_HORIZONTAL } from "./fixtures/northern-line-schematic-horizontal.ts";
import { NORTHERN_LINE_SCHEMATIC_VERTICAL } from "./fixtures/northern-line-schematic-vertical.ts";
import { validateSchematic, type LineSchematic } from "./line-schematic.ts";
import {
  buildLineTopologyFromStaticBranches,
  listBranchedLineIds,
} from "./line-topology.ts";

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
    .trim();

export const structuralMatchScore = (
  generated: LineSchematic,
  authored: LineSchematic,
): { score: number; shared: number; sideOk: number; orderOk: number } => {
  const authoredByKey = new Map<string, (typeof authored.nodes)[number][]>();
  for (const node of authored.nodes) {
    const key = stationKeyOf(node.stationKey ?? node.name);
    const list = authoredByKey.get(key) ?? [];
    list.push(node);
    authoredByKey.set(key, list);
  }
  const generatedByKey = new Map<string, (typeof generated.nodes)[number][]>();
  for (const node of generated.nodes) {
    const key = stationKeyOf(node.stationKey ?? node.name);
    const list = generatedByKey.get(key) ?? [];
    list.push(node);
    generatedByKey.set(key, list);
  }

  const sharedKeys = [...authoredByKey.keys()].filter((key) =>
    generatedByKey.has(key),
  );
  let sideOk = 0;
  for (const key of sharedKeys) {
    const authoredSigns = new Set(
      authoredByKey.get(key)!.map((node) => Math.sign(node.lane)),
    );
    const generatedSigns = new Set(
      generatedByKey.get(key)!.map((node) => Math.sign(node.lane)),
    );
    const agree =
      [...authoredSigns].every((sign) => generatedSigns.has(sign)) &&
      [...generatedSigns].every((sign) => authoredSigns.has(sign));
    if (agree) sideOk += 1;
  }

  const authoredBranches = new Map<string, (typeof authored.nodes)[number][]>();
  for (const node of authored.nodes) {
    for (const branchId of node.branchIds ?? []) {
      const list = authoredBranches.get(branchId) ?? [];
      list.push(node);
      authoredBranches.set(branchId, list);
    }
  }
  let orderPairs = 0;
  let orderOk = 0;
  for (const list of authoredBranches.values()) {
    const sorted = [...list].sort((a, b) => a.pos - b.pos);
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const a = stationKeyOf(sorted[i]!.stationKey ?? sorted[i]!.name);
      const b = stationKeyOf(sorted[i + 1]!.stationKey ?? sorted[i + 1]!.name);
      const ga = generatedByKey.get(a)?.[0];
      const gb = generatedByKey.get(b)?.[0];
      if (!ga || !gb) continue;
      orderPairs += 1;
      if (ga.pos <= gb.pos) orderOk += 1;
    }
  }

  const orderRatio = orderPairs === 0 ? 1 : orderOk / orderPairs;
  const sideRatio = sharedKeys.length === 0 ? 1 : sideOk / sharedKeys.length;
  const score = (sideRatio + orderRatio) / 2;

  return {
    score,
    shared: sharedKeys.length,
    sideOk,
    orderOk,
  };
};

describe("buildLineTopologyFromStaticBranches", () => {
  it("reads Northern inbound Regular segments without a network call", () => {
    const topology = buildLineTopologyFromStaticBranches("northern");
    assert.ok(topology);
    assert.equal(topology.lineId, "northern");
    assert.ok((topology.trunkStationIds?.length ?? 0) >= 30);
    assert.ok(topology.edges.length > 40);
    assert.ok(topology.stationNames?.["940GZZLUHBT"]?.includes("High Barnet"));
  });
});

describe("computeBranchSchematicLayout", () => {
  it("matches the hand-authored Northern horizontal schematic at ≥ 80%", () => {
    const generated = buildBranchSchematic("northern", "horizontal");
    assert.ok(generated);
    assert.equal(generated.orientation, "horizontal");
    const match = structuralMatchScore(
      generated,
      NORTHERN_LINE_SCHEMATIC_HORIZONTAL,
    );
    assert.ok(
      match.score >= 0.8,
      `Northern horizontal structural match ${((match.score ?? 0) * 100).toFixed(1)}% (side ${match.sideOk}/${match.shared}, order pairs ${match.orderOk})`,
    );
  });

  it("builds a distinct vertical Northern map (not a rotated horizontal)", () => {
    const horizontal = buildBranchSchematic("northern", "horizontal");
    const vertical = buildBranchSchematic("northern", "vertical");
    assert.ok(horizontal);
    assert.ok(vertical);
    assert.equal(vertical.orientation, "vertical");
    const match = structuralMatchScore(
      vertical,
      NORTHERN_LINE_SCHEMATIC_VERTICAL,
    );
    assert.ok(match.shared > 0);
    const sameLanes = horizontal.nodes.every((node) => {
      const other = vertical.nodes.find((candidate) => candidate.id === node.id);
      return other != null && other.lane === node.lane;
    });
    assert.equal(
      sameLanes,
      false,
      "vertical branch-to-lane map must differ from horizontal",
    );
  });

  it("keeps the longest branch on lane 0 and validates every branched line", () => {
    for (const orientation of ["horizontal", "vertical"] as const) {
      for (const lineId of listBranchedLineIds()) {
        const schematic = buildBranchSchematic(lineId, orientation);
        assert.ok(schematic, `expected ${orientation} schematic for ${lineId}`);
        assert.equal(schematic.orientation, orientation);
        const issues = validateSchematic(schematic);
        assert.deepEqual(
          issues,
          [],
          `${lineId} ${orientation}: ${issues.map((i) => i.message).join("; ")}`,
        );
        if (lineId === "circle") continue;
        const lane0 = schematic.nodes.filter((node) => node.lane === 0);
        const byLane = new Map<number, number>();
        for (const node of schematic.nodes) {
          byLane.set(node.lane, (byLane.get(node.lane) ?? 0) + 1);
        }
        const maxLaneCount = Math.max(...byLane.values());
        assert.ok(
          lane0.length === maxLaneCount,
          `${lineId} ${orientation}: longest lane should be 0 (lane0=${lane0.length}, max=${maxLaneCount})`,
        );
      }
    }
  });

  it("keeps DLR Star Lane on a lane next to Canning Town", () => {
    const schematic = buildBranchSchematic("dlr", "horizontal");
    assert.ok(schematic);
    const star = schematic.nodes.find(
      (node) => stationKeyOf(node.stationKey ?? node.name) === "star-lane",
    );
    const canning = schematic.nodes.find(
      (node) => stationKeyOf(node.stationKey ?? node.name) === "canning-town",
    );
    assert.ok(star);
    assert.ok(canning);
    assert.ok(
      Math.abs(star.lane - canning.lane) <= 1,
      `Star Lane lane ${star.lane} should sit next to Canning Town lane ${canning.lane}`,
    );
  });

  it("keeps one Poplar and one Stratford on DLR (they join, they are not Euston)", () => {
    const schematic = buildBranchSchematic("dlr", "horizontal");
    assert.ok(schematic);
    const poplar = schematic.nodes.filter(
      (node) => stationKeyOf(node.stationKey ?? node.name) === "poplar",
    );
    const stratford = schematic.nodes.filter(
      (node) => stationKeyOf(node.stationKey ?? node.name) === "stratford",
    );
    assert.equal(poplar.length, 1, `Poplar nodes: ${poplar.map((n) => `${n.id}@${n.lane}`).join(",")}`);
    assert.equal(
      stratford.length,
      1,
      `Stratford nodes: ${stratford.map((n) => `${n.id}@${n.lane}`).join(",")}`,
    );
  });

  it("draws Circle as a racetrack with a Hammersmith spur, not an unrolled sausage", () => {
    const schematic = buildBranchSchematic("circle", "horizontal");
    assert.ok(schematic);
    const lanes = new Set(schematic.nodes.map((node) => node.lane));
    assert.ok(lanes.size >= 2, "Circle loop needs at least two lanes");
    const edgware = schematic.nodes.filter((node) =>
      stationKeyOf(node.stationKey ?? node.name).startsWith("edgware-road"),
    );
    assert.equal(edgware.length, 1, "one Edgware Road, not a cut-and-unroll pair");
    const hammersmith = schematic.nodes.find((node) =>
      stationKeyOf(node.stationKey ?? node.name).startsWith("hammersmith"),
    );
    const bakerStreet = schematic.nodes.find((node) =>
      stationKeyOf(node.stationKey ?? node.name).startsWith("baker-street"),
    );
    assert.ok(hammersmith);
    assert.ok(bakerStreet);
    assert.notEqual(
      hammersmith.lane,
      bakerStreet.lane,
      "Hammersmith spur is not on the same lane as the loop",
    );
  });

  it("duplicates Euston on Northern (parallel Bank / Charing Cross corridors)", () => {
    const generated = buildBranchSchematic("northern", "horizontal");
    assert.ok(generated);
    const eustons = generated.nodes.filter(
      (node) => stationKeyOf(node.stationKey ?? node.name) === "euston",
    );
    assert.equal(eustons.length, 2);
    const lanes = new Set(eustons.map((node) => node.lane));
    assert.equal(lanes.size, 2);
  });
});
