import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createStressState, settleStressLayout } from "./stress-layout";
import { junctionRenderGraph, junctionStressGraph } from "./junction-render";
import { junctionExampleFor } from "./junction-examples";

describe("junctionRenderGraph", () => {
  it("builds a hub-and-legs star for a Y-junction", () => {
    const render = junctionRenderGraph(junctionExampleFor("y-junction")!);
    assert.ok(render.hasHub);
    assert.equal(render.nodes.length, 4); // hub + 3 legs
    assert.equal(render.edges.length, 3);
  });

  it("builds two disconnected pairs for a crossing, sharing no node", () => {
    const render = junctionRenderGraph(junctionExampleFor("crossing")!);
    assert.ok(!render.hasHub);
    assert.equal(render.nodes.length, 4);
    assert.equal(render.edges.length, 2);
    const nodeIds = new Set(render.nodes.map((n) => n.id));
    for (const edge of render.edges) {
      assert.ok(nodeIds.has(edge.from));
      assert.ok(nodeIds.has(edge.to));
    }
    // No node appears in both edges — the two lines share no vertex.
    const touched = render.edges.flatMap((e) => [e.from, e.to]);
    assert.equal(new Set(touched).size, touched.length);
  });

  it("settles a Y-junction into a stable, non-degenerate layout", () => {
    const junction = junctionExampleFor("y-junction")!;
    const state = createStressState(junctionStressGraph(junction));
    settleStressLayout(state);
    const spread = Math.max(...state.x) - Math.min(...state.x);
    assert.ok(Number.isFinite(spread) && spread > 1);
    assert.ok(state.x.every((v) => Number.isFinite(v)));
    assert.ok(state.y.every((v) => Number.isFinite(v)));
  });
});
