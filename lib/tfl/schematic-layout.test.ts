import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  branchStripMetrics,
  findOverlappingLabelPairs,
  placeBranchStripLabels,
} from "./branch-strip-layout.ts";
import { NORTHERN_LINE_SCHEMATIC_HORIZONTAL } from "./fixtures/northern-line-schematic-horizontal.ts";
import { NORTHERN_LINE_SCHEMATIC_VERTICAL } from "./fixtures/northern-line-schematic-vertical.ts";
import {
  layoutLineSchematic,
  maxOctilinearRadius,
  octilinearLanePath,
  orthogonalRoundedPath,
  type SchematicLayout,
} from "./schematic-layout.ts";
import type { LineSchematic } from "./line-schematic.ts";

/**
 * Geometry + label invariants for BranchStrip / Northern fixtures.
 *
 * Visual check after any edit: http://localhost:3999/docs/branch-strip
 * 1. Mill Hill curves into Finchley with a circular arc — never a flat 90° stub
 * 2. Camden → Mornington is a Line Diagram join (45° S or 90° R) — never Bezier
 * 3. Station labels do not overlap each other
 * 4. Every tick/dash is ⊥ to the local track (never parallel — esp. Mill Hill)
 */

const edgePath = (layout: SchematicLayout, from: string, to: string) => {
  const edge = layout.edges.find(
    (e) =>
      (e.from === from && e.to === to) || (e.from === to && e.to === from),
  );
  assert.ok(edge, `missing edge ${from}↔${to}`);
  return edge.path;
};

const nodePos = (schematic: LineSchematic, id: string) => {
  const node = schematic.nodes.find((n) => n.id === id);
  assert.ok(node, `missing node ${id}`);
  return node.pos;
};

const layoutNorthern = (orientation: "horizontal" | "vertical") => {
  const schematic =
    orientation === "horizontal"
      ? NORTHERN_LINE_SCHEMATIC_HORIZONTAL
      : NORTHERN_LINE_SCHEMATIC_VERTICAL;
  // Same font-derived pitches as BranchStrip (not hardwired px).
  const m = branchStripMetrics(orientation);
  return layoutLineSchematic(schematic, {
    orientation,
    x: m.x,
    mainPitch: m.mainPitch,
    lanePitch: m.lanePitch,
    padding: m.padding,
  });
};

describe("branchStripMetrics", () => {
  it("scales pitches with station-name em (not a fixed px grid)", () => {
    const a = branchStripMetrics("horizontal", 10);
    const b = branchStripMetrics("horizontal", 20);
    assert.equal(b.nameFont / a.nameFont, 2);
    assert.equal(b.mainPitch / a.mainPitch, 2);
    assert.equal(b.lanePitch / a.lanePitch, 2);
    assert.equal(a.mainPitch, a.nameFont * 6);
    assert.equal(a.lanePitch, a.nameFont * 5);
    assert.equal(a.lineBox, a.nameFont * a.labelLineHeight);
  });
});

describe("octilinearLanePath", () => {
  it("uses circular arcs for a 45° S when main span allows", () => {
    // Δmain=120, Δcross=56 → room for 45° S at R=20
    const path = octilinearLanePath(0, 0, 120, 56, 20, "x");
    assert.match(path, / A /);
    assert.doesNotMatch(path, / C /);
    // Two fillets + diagonal.
    assert.equal((path.match(/ A /g) ?? []).length, 2);
  });

  it("falls back to 90° R when cross > main (no 45° S)", () => {
    const path = octilinearLanePath(0, 0, 40, 80, 20, "x");
    assert.equal(maxOctilinearRadius(40, 80), 0);
    assert.match(path, / A /);
    assert.doesNotMatch(path, / C /);
    // Single quarter-circle like orthogonalRoundedPath.
    assert.equal((path.match(/ A /g) ?? []).length, 1);
  });

  it("collapses to a straight stub when main-axis span is zero", () => {
    const path = octilinearLanePath(0, 40, 80, 40, 20, "y");
    assert.equal(path, "M 0 40 L 80 40");
  });
});

describe("orthogonalRoundedPath", () => {
  it("draws a quarter-circle, not a Bezier", () => {
    const path = orthogonalRoundedPath(0, 0, 80, 60, 20, "x");
    assert.match(path, / A /);
    assert.doesNotMatch(path, / C /);
  });
});

describe("Northern BranchStrip geometry", () => {
  for (const orientation of ["horizontal", "vertical"] as const) {
    describe(orientation, () => {
      const schematic =
        orientation === "horizontal"
          ? NORTHERN_LINE_SCHEMATIC_HORIZONTAL
          : NORTHERN_LINE_SCHEMATIC_VERTICAL;
      const layout = layoutNorthern(orientation);

      it("Mill Hill is not on Finchley’s pos (forbids 90° stub)", () => {
        const millPos = nodePos(schematic, "mill-hill-east");
        const finchleyPos = nodePos(schematic, "finchley-central");
        assert.notEqual(millPos, finchleyPos);
        assert.ok(
          Math.abs(millPos - finchleyPos) >= 0.5,
          `Mill Hill needs ≥0.5 pos main-axis span, got Δ=${Math.abs(millPos - finchleyPos)}`,
        );
      });

      it("Mill Hill → Finchley is a circular arc bend, not a Bezier", () => {
        const path = edgePath(layout, "mill-hill-east", "finchley-central");
        assert.match(path, / A /, `expected circular arc, got: ${path}`);
        assert.doesNotMatch(path, / C /, `Bezier forbidden: ${path}`);
        // Both coordinates must change along a true lane-change curve.
        const m = path.match(
          /M ([\d.]+) ([\d.]+).*?([\d.]+) ([\d.]+)$/,
        );
        assert.ok(m, `unparsed path: ${path}`);
        assert.notEqual(Number(m![1]), Number(m![3]), "x must change");
        assert.notEqual(Number(m![2]), Number(m![4]), "y must change");
      });

      it("Camden → Mornington: arc join when lanes differ (no Bezier)", () => {
        const camden = schematic.nodes.find((n) => n.id === "camden-town")!;
        const mornington = schematic.nodes.find(
          (n) => n.id === "mornington-crescent",
        )!;
        const path = edgePath(layout, "camden-town", "mornington-crescent");
        assert.doesNotMatch(path, / C /, `Bezier forbidden: ${path}`);
        if (camden.lane !== mornington.lane) {
          assert.match(path, / A /, `expected circular arc, got: ${path}`);
        } else {
          assert.match(path, / L /);
          assert.doesNotMatch(path, / A /);
        }
      });

      it("every lane-change edge uses circular arcs (never Bezier)", () => {
        const byId = new Map(schematic.nodes.map((n) => [n.id, n]));
        for (const edge of layout.edges) {
          const from = byId.get(edge.from);
          const to = byId.get(edge.to);
          if (!from || !to || from.lane === to.lane) continue;
          assert.match(
            edge.path,
            / A /,
            `lane-change ${edge.from}→${edge.to} must use arcs, got: ${edge.path}`,
          );
          assert.doesNotMatch(
            edge.path,
            / C /,
            `Bezier on ${edge.from}→${edge.to}: ${edge.path}`,
          );
        }
      });

      it("Mill Hill dash tangent matches corridor (tick ⊥ line, never parallel)", () => {
        const mainAxis = orientation === "horizontal" ? "x" : "y";
        const mill = layout.points.find((p) => p.id === "mill-hill-east");
        const westFinchley = layout.points.find((p) => p.id === "west-finchley");
        assert.ok(mill && westFinchley);
        assert.equal(
          mill.trackAxis,
          mainAxis,
          "Mill Hill local tangent must follow corridor end (main axis)",
        );
        assert.equal(
          mill.trackAxis,
          westFinchley.trackAxis,
          "Mill Hill dash orientation must match other stations on this diagram",
        );
      });
    });
  }
});

describe("Northern BranchStrip labels", () => {
  for (const orientation of ["horizontal", "vertical"] as const) {
    it(`${orientation}: estimated label boxes do not overlap`, () => {
      const layout = layoutNorthern(orientation);
      const m = branchStripMetrics(orientation);
      const placements = placeBranchStripLabels(layout, {
        orientation,
        nameFont: m.nameFont,
        labelMaxWidth: m.labelMaxWidth,
        verticalLabelWidth: m.verticalLabelWidth,
        labelClearance: m.labelClearance,
        labelGap: m.labelGap,
        labelLineHeight: m.labelLineHeight,
        estimatedLines: 2,
      });
      const overlaps = findOverlappingLabelPairs(placements, 1);
      assert.deepEqual(
        overlaps,
        [],
        `overlapping labels: ${overlaps.map((p) => p.join("×")).join(", ")}`,
      );
    });
  }
});
