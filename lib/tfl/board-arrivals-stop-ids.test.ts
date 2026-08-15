import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildBoardArrivalsStopIdsIndex,
  lookupBoardArrivalsStopIds,
} from "@/lib/tfl/board-arrivals-stop-ids";

describe("lookupBoardArrivalsStopIds", () => {
  const index = buildBoardArrivalsStopIdsIndex();

  it("expands Liverpool Street Underground to include the rail sibling", () => {
    const ids = lookupBoardArrivalsStopIds(index, "940GZZLULVT");
    assert.ok(ids.includes("940GZZLULVT"));
    assert.ok(ids.includes("910GLIVST"));
  });

  it("expands Liverpool Street rail to include the Underground sibling", () => {
    const ids = lookupBoardArrivalsStopIds(index, "910GLIVST");
    assert.ok(ids.includes("940GZZLULVT"));
    assert.ok(ids.includes("910GLIVST"));
  });

  it("returns the input id for a single-member stop", () => {
    const ids = lookupBoardArrivalsStopIds(index, "910GWAPPING");
    assert.deepEqual(ids, ["910GWAPPING"]);
  });

  it("returns an empty list when no stop is selected", () => {
    assert.deepEqual(lookupBoardArrivalsStopIds(index, undefined), []);
    assert.deepEqual(lookupBoardArrivalsStopIds(index, "  "), []);
  });

  it("does not poll National Rail siblings at Waterloo", () => {
    const ids = lookupBoardArrivalsStopIds(index, "940GZZLUWLO");
    assert.deepEqual(ids, ["940GZZLUWLO"]);
  });

  it("does not poll the duplicate Elizabeth child at Liverpool Street", () => {
    const ids = lookupBoardArrivalsStopIds(index, "940GZZLULVT");
    assert.ok(!ids.includes("910GLIVSTLL"));
  });
});
