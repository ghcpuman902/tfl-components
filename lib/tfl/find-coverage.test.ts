import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isFindCovered,
  neededFindPhrases,
  phrasesToExpose,
  shouldExposeFindPhrase,
} from "./find-coverage.ts";

const WRAP_ABBR_COVERED = ["London", "Liverpool St", "Liverpool Street"];
const WRAP_FULL_COVERED = ["London", "Liverpool Street"];
const FULL_NAME = "London Liverpool Street";

describe("isFindCovered", () => {
  it("treats Liverpool St as already highlighted on Liverpool Street", () => {
    assert.equal(isFindCovered("Liverpool St", ["Liverpool Street"]), true);
  });

  it("does not treat the full name as covered across separate lines", () => {
    assert.equal(isFindCovered(FULL_NAME, WRAP_FULL_COVERED), false);
  });
});

describe("neededFindPhrases", () => {
  it("keeps the full name when wrap breaks find across lines", () => {
    assert.deepEqual(neededFindPhrases([FULL_NAME], WRAP_ABBR_COVERED), [
      FULL_NAME,
    ]);
  });

  it("drops the full name when a single line already expands to it", () => {
    assert.deepEqual(
      neededFindPhrases([FULL_NAME], ["London Liverpool Street"]),
      [],
    );
  });
});

describe("shouldExposeFindPhrase", () => {
  it("hides the chip when Liverpool St already matches the paint", () => {
    assert.equal(
      shouldExposeFindPhrase(FULL_NAME, WRAP_ABBR_COVERED, "Liverpool St"),
      false,
    );
    assert.equal(
      shouldExposeFindPhrase(FULL_NAME, WRAP_FULL_COVERED, "Liverpool St"),
      false,
    );
  });

  it("keeps the chip when the full name cannot match across a line break", () => {
    assert.equal(
      shouldExposeFindPhrase(FULL_NAME, WRAP_ABBR_COVERED, FULL_NAME),
      true,
    );
    assert.equal(
      shouldExposeFindPhrase(FULL_NAME, WRAP_FULL_COVERED, FULL_NAME),
      true,
    );
  });

  it("keeps an uncovered chip before any query so the first match can land", () => {
    assert.equal(shouldExposeFindPhrase(FULL_NAME, WRAP_ABBR_COVERED, ""), true);
  });

  it("does not expose a chip when the paint already is the full name", () => {
    assert.equal(
      shouldExposeFindPhrase(FULL_NAME, [FULL_NAME], FULL_NAME),
      false,
    );
  });

  it("exposes & → and only when that form is not already in the paint", () => {
    const covered = ["Highbury & Islington"];
    const andForm = "Highbury and Islington";
    assert.equal(shouldExposeFindPhrase(andForm, covered, "Highbury"), false);
    assert.equal(shouldExposeFindPhrase(andForm, covered, "and"), true);
    assert.equal(shouldExposeFindPhrase(andForm, covered, andForm), true);
  });
});

describe("phrasesToExpose", () => {
  it("returns one full-name chip, not a variant per abbreviation", () => {
    assert.deepEqual(
      phrasesToExpose(
        [FULL_NAME, "London Liverpool St", "Liverpool Street"],
        WRAP_ABBR_COVERED,
        "",
      ),
      [FULL_NAME],
    );
  });
});
