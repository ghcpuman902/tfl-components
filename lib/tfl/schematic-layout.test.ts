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
  maxSpurRadius,
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

const pathHas45Run = (path: string): boolean => {
  const tokens = path.split(/ +/);
  let x = 0;
  let y = 0;
  for (let i = 0; i < tokens.length; ) {
    const cmd = tokens[i];
    if (cmd === "M" || cmd === "L") {
      const nx = Number(tokens[i + 1]);
      const ny = Number(tokens[i + 2]);
      if (cmd === "L") {
        const dx = nx - x;
        const dy = ny - y;
        if (Math.abs(dx) > 0.5 && Math.abs(Math.abs(dy / dx) - 1) < 0.05) {
          return true;
        }
      }
      x = nx;
      y = ny;
      i += 3;
    } else if (cmd === "A") {
      x = Number(tokens[i + 6]);
      y = Number(tokens[i + 7]);
      i += 8;
    } else {
      i += 1;
    }
  }
  return false;
};

describe("maxSpurRadius", () => {
  it("is positive when main span clears a 45° diagonal", () => {
    assert.ok(maxSpurRadius(120, 100) > 30);
    assert.equal(maxSpurRadius(60, 100), 0);
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
        if (orientation === "horizontal") {
          assert.equal(
            (path.match(/ A /g) ?? []).length,
            1,
            `horizontal spur must be a single fillet, got: ${path}`,
          );
          assert.equal(
            pathHas45Run(path),
            true,
            `horizontal spur must include a 45° run, got: ${path}`,
          );
        } else {
          assert.equal(
            (path.match(/ A /g) ?? []).length,
            1,
            `vertical spur stays a quarter-circle, got: ${path}`,
          );
          assert.equal(
            pathHas45Run(path),
            false,
            `vertical §11 must not grow a 45° run, got: ${path}`,
          );
        }
      });

      it("horizontal spurs keep a positive 45° radius", () => {
        if (orientation !== "horizontal") return;
        const byId = new Map(schematic.nodes.map((n) => [n.id, n]));
        for (const edge of layout.edges) {
          const from = byId.get(edge.from);
          const to = byId.get(edge.to);
          if (!from || !to || from.lane === to.lane) continue;
          const fromDeg = schematic.edges.filter(
            (e) => e.from === from.id || e.to === from.id,
          ).length;
          const toDeg = schematic.edges.filter(
            (e) => e.from === to.id || e.to === to.id,
          ).length;
          const isSpur =
            (from.kind === "terminus" && fromDeg === 1 && toDeg >= 2) ||
            (to.kind === "terminus" && toDeg === 1 && fromDeg >= 2);
          if (!isSpur) continue;
          const mainDelta = Math.abs(from.pos - to.pos) * layout.mainPitch;
          const crossDelta = Math.abs(from.lane - to.lane) * layout.lanePitch;
          assert.ok(
            maxSpurRadius(mainDelta, crossDelta) > 0.5,
            `spur ${edge.from}→${edge.to} has no 45° room (Δmain=${mainDelta}, Δcross=${crossDelta})`,
          );
        }
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
        if (orientation === "horizontal") {
          const norm = ((mill.trackAngle % 180) + 180) % 180;
          assert.ok(
            Math.abs(norm - 45) < 1 || Math.abs(norm - 135) < 1,
            `horizontal Mill Hill trackAngle should be 45-family, got ${mill.trackAngle}`,
          );
        } else {
          assert.equal(mill.trackAngle, 90);
        }
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
