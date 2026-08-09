import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findOverlappingLabelPairs,
  placeBranchStripLabels,
} from "./branch-strip-layout.ts";
import { NORTHERN_LINE_SCHEMATIC_HORIZONTAL } from "./fixtures/northern-line-schematic-horizontal.ts";
import { NORTHERN_LINE_SCHEMATIC_VERTICAL } from "./fixtures/northern-line-schematic-vertical.ts";
import {
  bezierLanePath,
  layoutLineSchematic,
  type SchematicLayout,
} from "./schematic-layout.ts";
import type { LineSchematic } from "./line-schematic.ts";

/**
 * Geometry + label invariants for BranchStrip / Northern fixtures.
 *
 * Visual check after any edit: http://localhost:3999/components/branch-strip
 * 1. Mill Hill curves into Finchley (Bezier) — never a flat 90° stub
 * 2. Camden → Mornington is a smooth S-curve — never staircase / arc-L
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
  // Match BranchStrip pitch ratios (absolute scale cancels for invariants).
  return layoutLineSchematic(schematic, {
    orientation,
    mainPitch: orientation === "horizontal" ? 72 : 84,
    lanePitch: orientation === "horizontal" ? 56 : 108,
    padding: 36,
  });
};

describe("bezierLanePath", () => {
  it("returns a cubic when both axes move (not a 90° L)", () => {
    const path = bezierLanePath(0, 0, 80, 60, "y", 80);
    assert.match(path, / C /);
    assert.doesNotMatch(path, / A /);
  });

  it("collapses to a straight stub when main-axis span is zero (the 90° case)", () => {
    // Same pos / pure cross-axis — fixtures must never author this for Mill Hill.
    const path = bezierLanePath(0, 40, 80, 40, "y", 80);
    assert.equal(path, "M 0 40 L 80 40");
    assert.doesNotMatch(path, / C /);
  });

  it("keeps control points ordered along the main axis (no kinked join)", () => {
    const path = bezierLanePath(0, 0, 120, 80, "x", 80);
    const m = path.match(
      /M ([\d.]+) ([\d.]+) C ([\d.]+) ([\d.]+), ([\d.]+) ([\d.]+), ([\d.]+) ([\d.]+)/,
    );
    assert.ok(m);
    const cx1 = Number(m![3]);
    const cx2 = Number(m![5]);
    assert.ok(cx1 < cx2, `crossed handles: ${path}`);
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

      it("Mill Hill → Finchley is a Bezier curve, not a 90° L or staircase", () => {
        const path = edgePath(layout, "mill-hill-east", "finchley-central");
        assert.match(path, / C /, `expected Bezier, got: ${path}`);
        assert.doesNotMatch(path, / A /, `staircase arc forbidden: ${path}`);
        // Both coordinates must change along a true lane-change curve.
        const m = path.match(
          /M ([\d.]+) ([\d.]+) C [\d.]+ [\d.]+, [\d.]+ [\d.]+, ([\d.]+) ([\d.]+)/,
        );
        assert.ok(m, `unparsed Bezier: ${path}`);
        assert.notEqual(Number(m![1]), Number(m![3]), "x must change");
        assert.notEqual(Number(m![2]), Number(m![4]), "y must change");
      });

      it("Camden → Mornington: Bezier when lanes differ (no staircase)", () => {
        const camden = schematic.nodes.find((n) => n.id === "camden-town")!;
        const mornington = schematic.nodes.find(
          (n) => n.id === "mornington-crescent",
        )!;
        const path = edgePath(layout, "camden-town", "mornington-crescent");
        assert.doesNotMatch(path, / A /, `staircase arc forbidden: ${path}`);
        if (camden.lane !== mornington.lane) {
          // Horizontal: CX drops a lane — must be a smooth S, not an elbow.
          assert.match(path, / C /, `expected Bezier, got: ${path}`);
        } else {
          // Vertical: Mornington stays on the spine — straight is correct.
          assert.match(path, / L /);
          assert.doesNotMatch(path, / C /);
        }
      });

      it("every lane-change edge is a Bezier (never staircase / 90° L)", () => {
        const byId = new Map(schematic.nodes.map((n) => [n.id, n]));
        for (const edge of layout.edges) {
          const from = byId.get(edge.from);
          const to = byId.get(edge.to);
          if (!from || !to || from.lane === to.lane) continue;
          assert.match(
            edge.path,
            / C /,
            `lane-change ${edge.from}→${edge.to} must be Bezier, got: ${edge.path}`,
          );
          assert.doesNotMatch(
            edge.path,
            / A /,
            `staircase on ${edge.from}→${edge.to}: ${edge.path}`,
          );
        }
      });

      it("Mill Hill dash tangent matches corridor (tick ⊥ line, never parallel)", () => {
        const mainAxis = orientation === "horizontal" ? "x" : "y";
        const mill = layout.points.find((p) => p.id === "mill-hill-east");
        const westFinchley = layout.points.find((p) => p.id === "west-finchley");
        assert.ok(mill && westFinchley);
        // Bezier end tangent is main-axis — same as neighbouring corridor stops.
        assert.equal(
          mill.trackAxis,
          mainAxis,
          "Mill Hill local tangent must follow Bezier end (main axis)",
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
      const nameFont = 12;
      const placements = placeBranchStripLabels(layout, {
        orientation,
        nameFont,
        // Keep labels narrower than station pitch so neighbours clear.
        labelMaxWidth: layout.mainPitch * 0.7,
        verticalLabelWidth: Math.min(72, layout.lanePitch * 0.65),
        labelClearance: 14,
        labelGap: 10,
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
