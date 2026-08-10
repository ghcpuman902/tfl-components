import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  expandStationLineForFind,
  stationCopyName,
  stationFindAliases,
  stationFindCoveredPhrases,
} from "./station-label-find.ts";

/**
 * StationName find/copy contract — must not regress.
 *
 * Visual paint may wrap (`<br>`) and abbreviate (St). Copy, aria, and
 * Cmd/Ctrl+F must still resolve the canonical single-line full name.
 *
 * DOM note: Chrome does not match a phrase across `<br>`. StationName exposes
 * the canonical name with `hidden="until-found"` (revealed when find matches).
 * That attribute is silently useless in two ways worth guarding in review:
 * React serialises `hidden` as a boolean, and `until-found` is ignored on
 * `display: inline`. Verified in Chrome via a `#:~:text=` navigation, which
 * shares find-in-page's reveal algorithm.
 */

describe("stationCopyName", () => {
  it("returns a single-line full name", () => {
    assert.equal(
      stationCopyName("London Liverpool Street"),
      "London Liverpool Street",
    );
  });
});

describe("expandStationLineForFind", () => {
  it("completes St → Street for find-in-page", () => {
    assert.equal(
      expandStationLineForFind("Liverpool St"),
      "Liverpool Street",
    );
  });
});

describe("stationFindCoveredPhrases", () => {
  it("treats single-line abbr expansion as contiguous", () => {
    const covered = stationFindCoveredPhrases(["London Liverpool St"]);
    assert.ok(covered.some((p) => p === "London Liverpool Street"));
  });

  it("does not treat joined multi-line expansion as contiguous", () => {
    const covered = stationFindCoveredPhrases([
      "London",
      "Liverpool St",
    ]);
    assert.ok(covered.includes("Liverpool Street"));
    assert.ok(!covered.includes("London Liverpool Street"));
  });
});

describe("stationFindAliases", () => {
  it("exposes full name when paint wraps across lines (br breaks find)", () => {
    const copyName = "London Liverpool Street";
    const aliases = stationFindAliases(copyName, [
      "London",
      "Liverpool St",
    ]);
    assert.ok(
      aliases.includes(copyName),
      `expected alias ${copyName}, got ${JSON.stringify(aliases)}`,
    );
  });

  it("exposes full name when wrap uses unabbreviated lines", () => {
    const copyName = "London Liverpool Street";
    const aliases = stationFindAliases(copyName, [
      "London",
      "Liverpool Street",
    ]);
    assert.ok(aliases.includes(copyName));
  });

  it("skips full-name alias when a single visual line already expands to it", () => {
    const copyName = "London Liverpool Street";
    const aliases = stationFindAliases(copyName, ["London Liverpool St"]);
    assert.ok(!aliases.includes(copyName));
  });

  it("drops aliases contained in a longer one so match counts stay honest", () => {
    const aliases = stationFindAliases("London Liverpool Street", [
      "London",
      "Liverpool St",
    ]);
    assert.deepEqual(aliases, ["London Liverpool Street"]);
  });

  it("still allows finding Liverpool Street via per-line completion alone", () => {
    const covered = stationFindCoveredPhrases([
      "London",
      "Liverpool St",
    ]);
    assert.ok(covered.includes("Liverpool Street"));
  });
});
