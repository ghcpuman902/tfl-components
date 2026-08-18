import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HOME_RAIL_STOP } from "./home-arrivals-stops";
import {
  buildBoardStationNamesIndex,
  buildBoardStationSearchIndex,
  getBoardStationNamesIndex,
  lookupBoardStationName,
  matchBoardStationSearchItem,
  resolveBoardStopNameOverride,
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

describe("buildBoardStationSearchIndex", () => {
  const items = buildBoardStationSearchIndex();

  it("lists Oxford Circus with mode context", () => {
    const item = matchBoardStationSearchItem(items, HOME_RAIL_STOP.id);
    assert.equal(item?.name, HOME_RAIL_STOP.name);
    assert.match(item?.context ?? "", /Tube/);
  });

  it("matches an alias id to the primary station", () => {
    const withAlias = items.find((item) => item.aliasIds.length > 0);
    assert.ok(withAlias);
    const aliasId = withAlias.aliasIds[0];
    assert.ok(aliasId);
    const matched = matchBoardStationSearchItem(items, aliasId);
    assert.equal(matched?.id, withAlias.id);
  });

  it("adds line names when two stations share a display name", () => {
    const duplicates = items.filter(
      (item) => items.filter((other) => other.name === item.name).length > 1,
    );
    if (duplicates.length === 0) return;
    assert.ok(duplicates.every((item) => item.context.includes("·")));
  });
});

describe("resolveBoardStopNameOverride", () => {
  it("treats empty and catalog-matching names as no override", () => {
    assert.equal(resolveBoardStopNameOverride(undefined, "Oxford Circus"), undefined);
    assert.equal(resolveBoardStopNameOverride("  ", "Oxford Circus"), undefined);
    assert.equal(
      resolveBoardStopNameOverride("Oxford Circus", "Oxford Circus"),
      undefined,
    );
  });

  it("keeps a custom label", () => {
    assert.equal(
      resolveBoardStopNameOverride("Home", "Oxford Circus"),
      "Home",
    );
  });
});
