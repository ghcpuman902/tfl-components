import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HOME_RAIL_STOP } from "./home-arrivals-stops";
import {
  buildBoardStationLinesIndex,
  getBoardStationLinesIndex,
  lookupBoardStationLineGroups,
  lookupBoardStationLines,
  lookupSharedTrackFamilies,
  lookupSharedTrackLineIds,
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

describe("lookupBoardStationLineGroups", () => {
  it("merges Circle / H&C / Metropolitan at Liverpool Street", () => {
    const groups = lookupBoardStationLineGroups("940GZZLULVT");
    assert.ok(groups);
    assert.deepEqual(groups[0]?.lines, [
      "circle",
      "hammersmith-city",
      "metropolitan",
    ]);
    assert.equal(groups[0]?.pageSize, 6);
  });

  it("resolves Liverpool Street aliases to the same merge", () => {
    const tube = lookupBoardStationLineGroups("940GZZLULVT");
    const rail = lookupBoardStationLineGroups("910GLIVST");
    assert.equal(rail, tube);
  });

  it("merges Circle / H&C only at Baker Street (Metropolitan stays separate)", () => {
    const groups = lookupBoardStationLineGroups("940GZZLUBST");
    assert.ok(groups);
    assert.deepEqual(groups[0]?.lines, ["circle", "hammersmith-city"]);
  });

  it("merges all three subsurface lines at King's Cross and Farringdon", () => {
    for (const stopId of ["940GZZLUKSX", "940GZZLUFCN", "940GZZLUGPS"]) {
      const groups = lookupBoardStationLineGroups(stopId);
      assert.ok(groups, stopId);
      assert.deepEqual(groups[0]?.lines, [
        "circle",
        "hammersmith-city",
        "metropolitan",
      ]);
    }
  });

  it("merges Circle and Metropolitan at Aldgate", () => {
    assert.deepEqual(lookupBoardStationLineGroups("940GZZLUALD")?.[0]?.lines, [
      "circle",
      "metropolitan",
    ]);
  });

  it("merges Circle and H&C on the Hammersmith branch, and all three at Paddington Circle", () => {
    assert.deepEqual(lookupBoardStationLineGroups("940GZZLUPAH")?.[0]?.lines, [
      "circle",
      "hammersmith-city",
    ]);
    // H&C (sometimes dual-listed with District) repeatedly surfaces on
    // Paddington Circle's own platforms in live data even though tfl-ts's
    // static topology doesn't mark this pair as shared-track — see the
    // curated override in board-station-lines.ts.
    assert.deepEqual(lookupBoardStationLineGroups("940GZZLUPAC")?.[0]?.lines, [
      "district",
      "circle",
      "hammersmith-city",
    ]);
  });

  it("merges Circle and District on the southern loop", () => {
    for (const stopId of ["940GZZLUVIC", "940GZZLUTWH", "940GZZLUSKS"]) {
      assert.deepEqual(
        lookupBoardStationLineGroups(stopId)?.[0]?.lines,
        ["district", "circle"],
        stopId,
      );
    }
  });

  it("merges District and H&C at Aldgate East", () => {
    assert.deepEqual(lookupBoardStationLineGroups("940GZZLUADE")?.[0]?.lines, [
      "district",
      "hammersmith-city",
    ]);
  });

  it("auto-merges Circle and H&C at Hammersmith's H&C/Circle building, with no curated override needed", () => {
    // Unlike Paddington Circle, tfl-ts's static topology already marks
    // 940GZZLUHSC as shared for this pair — no SHARED_TRACK_MERGE_INCLUDE
    // entry exists for it. TfL tags every Circle-bound train through here as
    // "hammersmith-city", so without this merge the Circle section would
    // read "No information" forever even though trains are running.
    assert.deepEqual(lookupBoardStationLineGroups("940GZZLUHSC")?.[0]?.lines, [
      "circle",
      "hammersmith-city",
    ]);
  });

  it("does not leak the Circle/H&C merge onto Hammersmith's separate District & Piccadilly building", () => {
    // 940GZZLUHSD is a different physical station (different platforms, a
    // few minutes' walk away) that only ever sees District and Piccadilly
    // trains. It must not inherit 940GZZLUHSC's merge via hub-alias lookup.
    assert.equal(lookupBoardStationLineGroups("940GZZLUHSD"), undefined);
  });
});

describe("lookupSharedTrackLineIds", () => {
  it("lists Circle / H&C / Metropolitan at Liverpool Street", () => {
    assert.deepEqual(lookupSharedTrackLineIds("940GZZLULVT"), [
      "circle",
      "hammersmith-city",
      "metropolitan",
    ]);
  });

  it("resolves Liverpool Street aliases", () => {
    assert.equal(
      lookupSharedTrackLineIds("910GLIVST"),
      lookupSharedTrackLineIds("940GZZLULVT"),
    );
  });

  it("reconciles the three-line set at Baker Street and King's Cross", () => {
    const identity = [
      "circle",
      "hammersmith-city",
      "metropolitan",
    ];
    assert.deepEqual(lookupSharedTrackLineIds("940GZZLUBST"), identity);
    assert.deepEqual(lookupSharedTrackLineIds("940GZZLUKSX"), identity);
  });

  it("reconciles Circle and District at Victoria, and all three at Paddington Circle", () => {
    assert.deepEqual(lookupSharedTrackLineIds("940GZZLUVIC"), [
      "district",
      "circle",
    ]);
    assert.deepEqual(lookupSharedTrackLineIds("940GZZLUPAC"), [
      "district",
      "circle",
      "hammersmith-city",
    ]);
  });

  it("keeps Circle/District as its own family at Victoria, not mixed into H&C/Met", () => {
    const families = lookupSharedTrackFamilies("940GZZLUVIC");
    assert.ok(families);
    assert.deepEqual(families, [["district", "circle"]]);
    const livst = lookupSharedTrackFamilies("940GZZLULVT");
    assert.ok(livst);
    assert.deepEqual(livst, [
      ["circle", "hammersmith-city", "metropolitan"],
    ]);
  });

  it("replaces the auto-derived family at Paddington Circle with the curated superset", () => {
    const families = lookupSharedTrackFamilies("940GZZLUPAC");
    assert.ok(families);
    assert.deepEqual(families, [["district", "circle", "hammersmith-city"]]);
  });
});