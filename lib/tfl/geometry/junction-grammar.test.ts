import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  JUNCTION_TYPE_IDS,
  canMove,
  connectedLegPairs,
  isFullyConnected,
  symmetricMovements,
  validateJunction,
  type Junction,
} from "./junction-grammar";
import { JUNCTION_EXAMPLES, junctionExampleFor } from "./junction-examples";

describe("junction taxonomy", () => {
  it("has exactly one example per taxonomy type", () => {
    for (const type of JUNCTION_TYPE_IDS) {
      assert.ok(junctionExampleFor(type), `missing example for ${type}`);
    }
    assert.equal(JUNCTION_EXAMPLES.length, JUNCTION_TYPE_IDS.length);
  });

  it("every example passes validation", () => {
    for (const junction of JUNCTION_EXAMPLES) {
      assert.deepEqual(validateJunction(junction), [], `${junction.id} should be valid`);
    }
  });
});

describe("junction grammar helpers", () => {
  it("a Y-junction lets the trunk reach both branches but not branch-to-branch", () => {
    const yJunction = junctionExampleFor("y-junction")!;
    assert.ok(canMove(yJunction, "paddington", "heathrow"));
    assert.ok(canMove(yJunction, "paddington", "reading"));
    assert.ok(!canMove(yJunction, "heathrow", "reading"));
    assert.ok(!isFullyConnected(yJunction));
  });

  it("a wye permits every pairwise movement, unlike a Y-junction with the same leg count", () => {
    const wye = junctionExampleFor("wye")!;
    assert.ok(isFullyConnected(wye));
    assert.equal(connectedLegPairs(wye).length, 3);
  });

  it("a crossing has zero movements even though four legs meet visually", () => {
    const crossing = junctionExampleFor("crossing")!;
    assert.equal(crossing.movements.length, 0);
    assert.equal(connectedLegPairs(crossing).length, 0);
  });

  it("geometry alone (three legs) does not determine connectivity", () => {
    const sharedLegs: Junction["legs"] = [
      { id: "a", label: "A", bearingDeg: 0 },
      { id: "b", label: "B", bearingDeg: 120 },
      { id: "c", label: "C", bearingDeg: 240 },
    ];
    const partial: Junction = {
      id: "test-partial",
      type: "y-junction",
      label: "Test",
      legs: sharedLegs,
      movements: symmetricMovements([["a", "b"], ["a", "c"]]),
    };
    const full: Junction = { ...partial, id: "test-full", type: "wye", movements: symmetricMovements([["a", "b"], ["a", "c"], ["b", "c"]]) };
    assert.ok(!isFullyConnected(partial));
    assert.ok(isFullyConnected(full));
  });

  it("flags an undeclared leg reference and a self-movement", () => {
    const broken: Junction = {
      id: "broken",
      type: "y-junction",
      label: "Broken",
      legs: [
        { id: "a", label: "A", bearingDeg: 0 },
        { id: "b", label: "B", bearingDeg: 90 },
        { id: "c", label: "C", bearingDeg: 180 },
      ],
      movements: [
        { from: "a", to: "b" },
        { from: "a", to: "ghost" },
        { from: "b", to: "b" },
      ],
    };
    const problems = validateJunction(broken);
    assert.ok(problems.some((p) => p.includes("ghost")));
    assert.ok(problems.some((p) => p.includes("itself")));
  });

  it("marks a spur's dead-end leg as terminal, distinct from an unused Y-junction pairing", () => {
    const spur = junctionExampleFor("spur")!;
    const deadEnd = spur.legs.find((leg) => leg.id === "t5");
    assert.ok(deadEnd?.terminal);
  });

  it("marks the flying-junction movement as grade-separated, not a different shape", () => {
    const flying = junctionExampleFor("grade-separated")!;
    const crossingMove = flying.movements.find((m) => m.from === "bank-north" && m.to === "cx-south");
    assert.ok(crossingMove?.gradeSeparated);
  });
});
