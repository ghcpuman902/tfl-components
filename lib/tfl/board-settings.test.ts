import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BOARD_SETTINGS,
  FORM_BOARD_SETTING_IDS,
  URL_BOARD_SETTING_IDS,
  parseArrivalsLines,
  parseArrivalsRows,
  parseFitMode,
  parseInteractionMode,
  parseLineIdItem,
  parseRowsItem,
  serializeArrivalsLines,
  serializeArrivalsRows,
} from "./board-settings";
import { RAIL_ARRIVALS_DEFAULT_PAGE_SIZE } from "./arrivals-defaults";

describe("board-settings allowlist", () => {
  it("every form setting is also a url setting", () => {
    for (const id of FORM_BOARD_SETTING_IDS) {
      assert.equal(BOARD_SETTINGS[id].url, true, `${id} form without url`);
    }
  });

  it("exposes a.lines as a URL setting with a line-order form control", () => {
    assert.equal(BOARD_SETTINGS.arrivalsLines.url, true);
    assert.equal(BOARD_SETTINGS.arrivalsLines.form, true);
    assert.equal(BOARD_SETTINGS.arrivalsRows.form, true);
  });

  it("lists url settings including shell and arrivals", () => {
    assert.ok(URL_BOARD_SETTING_IDS.includes("stop"));
    assert.ok(URL_BOARD_SETTING_IDS.includes("arrivalsRows"));
    assert.ok(URL_BOARD_SETTING_IDS.includes("arrivalsLines"));
  });
});

describe("parseRowsItem", () => {
  it("accepts 0 through 16", () => {
    assert.equal(parseRowsItem("0"), 0);
    assert.equal(parseRowsItem("3"), 3);
    assert.equal(parseRowsItem("16"), 16);
  });

  it("clamps above 16", () => {
    assert.equal(parseRowsItem("17"), 16);
    assert.equal(parseRowsItem("100"), 16);
  });

  it("rejects negative, decimal, non-numeric, empty", () => {
    assert.equal(parseRowsItem("-1"), undefined);
    assert.equal(parseRowsItem("2.5"), undefined);
    assert.equal(parseRowsItem("abc"), undefined);
    assert.equal(parseRowsItem(""), undefined);
    assert.equal(parseRowsItem("  "), undefined);
  });
});

describe("parseArrivalsRows", () => {
  it("parses scalar and list forms", () => {
    assert.equal(parseArrivalsRows("6"), 6);
    assert.equal(parseArrivalsRows("3"), 3);
    assert.deepEqual(parseArrivalsRows("3,"), [3, undefined]);
    assert.deepEqual(parseArrivalsRows("3,6,"), [3, 6, undefined]);
    assert.deepEqual(parseArrivalsRows("6,2,2"), [6, 2, 2]);
    assert.deepEqual(parseArrivalsRows("6,,2"), [6, undefined, 2]);
  });

  it("returns undefined for null or empty", () => {
    assert.equal(parseArrivalsRows(null), undefined);
    assert.equal(parseArrivalsRows(""), undefined);
  });
});

describe("serializeArrivalsRows", () => {
  it("keeps a scalar 3 — broadcast, not the empty default", () => {
    assert.equal(serializeArrivalsRows(RAIL_ARRIVALS_DEFAULT_PAGE_SIZE), "3");
  });

  it("serializes scalars and lists, keeping empty slots", () => {
    assert.equal(serializeArrivalsRows(6), "6");
    assert.equal(serializeArrivalsRows(0), "0");
    assert.equal(serializeArrivalsRows([3, undefined]), "3,");
    assert.equal(serializeArrivalsRows([3, 6, undefined]), "3,6,");
    assert.equal(serializeArrivalsRows([6, 2, 2]), "6,2,2");
    assert.equal(serializeArrivalsRows([6, undefined, 2]), "6,,2");
  });

  it("omits an empty or all-blank list", () => {
    assert.equal(serializeArrivalsRows([]), undefined);
    assert.equal(serializeArrivalsRows([undefined, undefined]), undefined);
  });
});

describe("parseArrivalsLines / parseLineIdItem", () => {
  it("normalizes and dedupes", () => {
    assert.deepEqual(parseArrivalsLines("Victoria,central,victoria"), [
      "victoria",
      "central",
    ]);
  });

  it("drops unknown line ids", () => {
    assert.equal(parseLineIdItem("not-a-line"), undefined);
    assert.deepEqual(parseArrivalsLines("bakerloo,not-a-line"), ["bakerloo"]);
  });

  it("serializes and omits empty", () => {
    assert.equal(serializeArrivalsLines(undefined), undefined);
    assert.equal(serializeArrivalsLines([]), undefined);
    assert.equal(
      serializeArrivalsLines(["victoria", "central"]),
      "victoria,central",
    );
  });
});

describe("mode and fit parsers", () => {
  it("accepts known values and rejects others", () => {
    assert.equal(parseInteractionMode("mouse"), "mouse");
    assert.equal(parseInteractionMode("voice"), undefined);
    assert.equal(parseFitMode("fill"), "fill");
    assert.equal(parseFitMode("stretch"), undefined);
  });
});
