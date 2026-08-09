import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DiagramStation } from "./diagram-station";
import {
  applyStripLabelRecipes,
  buildSegmentStateMap,
  prepareBranchStrip,
  prepareStraightStrip,
  stationOutOfUseFromSegments,
} from "./strip-model";
import type { LineSchematic } from "./line-schematic";

const spine = (names: string[]): DiagramStation[] =>
  names.map((name, index) => ({
    id: `s${index}`,
    name,
    interchange: index === 1,
  }));

describe("prepareStraightStrip", () => {
  it("builds adjacency segment states from overrides", () => {
    const stations = spine(["A", "B", "C", "D"]);
    const prepared = prepareStraightStrip(stations, {
      segments: [
        { fromStationId: "s1", toStationId: "s2", state: "out-of-use" },
      ],
      applyLabelRecipes: false,
    });

    assert.deepEqual(prepared.segmentStates, [
      "normal",
      "out-of-use",
      "normal",
    ]);
  });

  it("greys only stations whose every adjacent segment is closed", () => {
    const states = buildSegmentStateMap(spine(["A", "B", "C", "D"]), [
      { fromStationId: "s1", toStationId: "s2", state: "out-of-use" },
    ]);
    assert.deepEqual(stationOutOfUseFromSegments(4, states), [
      false,
      false,
      false,
      false,
    ]);

    const full = buildSegmentStateMap(spine(["A", "B", "C"]), [
      { fromStationId: "s0", toStationId: "s1", state: "out-of-use" },
      { fromStationId: "s1", toStationId: "s2", state: "out-of-use" },
    ]);
    assert.deepEqual(stationOutOfUseFromSegments(3, full), [true, true, true]);
  });

  it("applies editorial label recipes for known names", () => {
    const stations: DiagramStation[] = [
      { id: "940GZZLUOXC", name: "Oxford Circus", interchange: true },
      { id: "other", name: "Pimlico" },
    ];
    const withLabels = applyStripLabelRecipes(stations);
    assert.deepEqual(withLabels[0]?.labelLines, ["Oxford", "Circus"]);
    assert.equal(withLabels[1]?.labelLines, undefined);
  });

  it("honours explicit stationOutOfUseIds over segment derivation", () => {
    const prepared = prepareStraightStrip(spine(["A", "B", "C"]), {
      stationOutOfUseIds: ["s1"],
      applyLabelRecipes: false,
    });
    assert.deepEqual(prepared.stationOutOfUse, [false, true, false]);
  });
});

describe("prepareBranchStrip", () => {
  const schematic: LineSchematic = {
    lineId: "demo",
    lineName: "Demo",
    orientation: "horizontal",
    branches: [{ id: "main", name: "Main" }],
    nodes: [
      {
        id: "oxford",
        stationKey: "940GZZLUOXC",
        name: "Oxford Circus",
        lane: 0,
        pos: 0,
        kind: "interchange",
      },
      {
        id: "pimlico",
        name: "Pimlico",
        lane: 0,
        pos: 1,
        kind: "stop",
      },
    ],
    edges: [{ from: "oxford", to: "pimlico", branchId: "main" }],
  };

  it("maps node label recipes by node id", () => {
    const prepared = prepareBranchStrip(schematic);
    assert.deepEqual(prepared.nodeLabelLines.oxford, ["Oxford", "Circus"]);
    assert.equal(prepared.nodeLabelLines.pimlico, undefined);
  });

  it("can skip recipes when caller prepares labels", () => {
    const prepared = prepareBranchStrip(schematic, {
      applyLabelRecipes: false,
      nodeLabelLines: { oxford: ["Ox", "Circus"] },
    });
    assert.deepEqual(prepared.nodeLabelLines.oxford, ["Ox", "Circus"]);
  });
});
