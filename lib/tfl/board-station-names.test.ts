import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HOME_RAIL_STOP } from "./home-arrivals-stops";
import {
  buildBoardStationNamesIndex,
  getBoardStationNamesIndex,
  lookupBoardStationName,
} from "./board-station-names";

describe("buildBoardStationNamesIndex", () => {
  const index = buildBoardStationNamesIndex();

  it("resolves the display name for a known stop id", () => {
    assert.equal(
      lookupBoardStationName(index, HOME_RAIL_STOP.id),
      HOME_RAIL_STOP.name,
    );
  });

  it("returns undefined for unknown stops", () => {
    assert.equal(lookupBoardStationName(index, "not-a-stop"), undefined);
    assert.equal(lookupBoardStationName(index, undefined), undefined);
    assert.equal(lookupBoardStationName(index, "  "), undefined);
  });

  it("memoises getBoardStationNamesIndex", () => {
    assert.equal(getBoardStationNamesIndex(), getBoardStationNamesIndex());
  });
});
