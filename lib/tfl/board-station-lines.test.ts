import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HOME_RAIL_STOP } from "./home-arrivals-stops";
import {
  buildBoardStationLinesIndex,
  getBoardStationLinesIndex,
  lookupBoardStationLines,
} from "./board-station-lines";

describe("buildBoardStationLinesIndex", () => {
  const index = buildBoardStationLinesIndex();

  it("includes Oxford Circus with curated bounds in canonical order", () => {
    const lines = lookupBoardStationLines(index, HOME_RAIL_STOP.id);
    assert.ok(lines);
    assert.deepEqual(
      lines!.map((line) => line.lineId),
      ["central", "victoria", "bakerloo"],
    );
    assert.deepEqual(
      lines!.find((line) => line.lineId === "central")?.bounds,
      ["westbound", "eastbound"],
    );
    assert.deepEqual(
      lines!.find((line) => line.lineId === "bakerloo")?.bounds,
      ["northbound", "southbound"],
    );
  });

  it("returns undefined for unknown stops", () => {
    assert.equal(lookupBoardStationLines(index, "not-a-stop"), undefined);
    assert.equal(lookupBoardStationLines(index, undefined), undefined);
    assert.equal(lookupBoardStationLines(index, "  "), undefined);
  });

  it("memoises getBoardStationLinesIndex", () => {
    assert.equal(getBoardStationLinesIndex(), getBoardStationLinesIndex());
  });

  it("lists Elizabeth line on Liverpool Street from the hub, not the tube id alone", () => {
    const lines = lookupBoardStationLines(index, "940GZZLULVT");
    assert.ok(lines);
    const ids = lines.map((line) => line.lineId);
    assert.ok(ids.includes("central"));
    assert.ok(ids.includes("elizabeth"));
    assert.ok(ids.includes("weaver"));
  });

  it("sorts membership canonically, not alphabetically", () => {
    const oxc = lookupBoardStationLines(index, HOME_RAIL_STOP.id)!
    const alpha = [...oxc].sort((a, b) => a.lineId.localeCompare(b.lineId))
    assert.notDeepEqual(
      oxc.map((l) => l.lineId),
      alpha.map((l) => l.lineId),
    )
  })
})