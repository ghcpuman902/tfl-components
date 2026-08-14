import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HOME_RAIL_LINES } from "./home-arrivals-stops";
import {
  resolveArrivalsProps,
  resolveEffectiveLineOrder,
} from "./board-config-resolve";
import { DEFAULT_BOARD_CONFIG, type BoardConfig } from "./board-url-state";

const base = (arrivals: BoardConfig["arrivals"]): BoardConfig => ({
  ...DEFAULT_BOARD_CONFIG,
  stop: "940GZZLUOXC",
  arrivals,
});

describe("resolveEffectiveLineOrder", () => {
  it("uses canonical serving order when no explicit lines", () => {
    assert.deepEqual(
      resolveEffectiveLineOrder(base({}), HOME_RAIL_LINES),
      ["central", "victoria", "bakerloo"],
    );
  });

  it("honors explicit order then remainder canonical", () => {
    assert.deepEqual(
      resolveEffectiveLineOrder(
        base({ lineOrder: ["victoria", "bakerloo"] }),
        HOME_RAIL_LINES,
      ),
      ["victoria", "bakerloo", "central"],
    );
  });

  it("skips explicit non-serving lines (does not seed)", () => {
    assert.deepEqual(
      resolveEffectiveLineOrder(
        base({ lineOrder: ["jubilee", "victoria"] }),
        HOME_RAIL_LINES,
      ),
      ["victoria", "central", "bakerloo"],
    );
  });

  it("falls back to canonical data line ids when no offline membership", () => {
    assert.deepEqual(
      resolveEffectiveLineOrder(base({}), undefined, [
        "bakerloo",
        "victoria",
        "central",
      ]),
      ["central", "victoria", "bakerloo"],
    );
  });
});

describe("resolveArrivalsProps", () => {
  it("broadcasts scalar pageSize and seeds lines", () => {
    const props = resolveArrivalsProps(base({ rows: 6 }), HOME_RAIL_LINES);
    assert.equal(props.pageSize, 6);
    assert.equal(props.pageSizeByLine, undefined);
    assert.equal(props.lines, HOME_RAIL_LINES);
  });

  it("omits scalar default pageSize", () => {
    const props = resolveArrivalsProps(base({ rows: 3 }), HOME_RAIL_LINES);
    assert.equal(props.pageSize, undefined);
  });

  it("zips positional rows by canonical serving order", () => {
    const props = resolveArrivalsProps(
      base({ rows: [6, 2, 2] }),
      HOME_RAIL_LINES,
    );
    assert.deepEqual(props.pageSizeByLine, {
      central: 6,
      victoria: 2,
      bakerloo: 2,
    });
  });

  it("zips positional rows by explicit lineOrder", () => {
    const props = resolveArrivalsProps(
      base({
        rows: [6, 2, 2],
        lineOrder: ["victoria", "central", "bakerloo"],
      }),
      HOME_RAIL_LINES,
    );
    assert.deepEqual(props.lineOrder, ["victoria", "central", "bakerloo"]);
    assert.deepEqual(props.pageSizeByLine, {
      victoria: 6,
      central: 2,
      bakerloo: 2,
    });
  });

  it("fills shorter lists with gaps (default for unmatched)", () => {
    const props = resolveArrivalsProps(
      base({ rows: [6] }),
      HOME_RAIL_LINES,
    );
    assert.deepEqual(props.pageSizeByLine, { central: 6 });
  });

  it("ignores longer list extras", () => {
    const props = resolveArrivalsProps(
      base({ rows: [6, 2, 2, 9, 9] }),
      HOME_RAIL_LINES,
    );
    assert.deepEqual(props.pageSizeByLine, {
      central: 6,
      victoria: 2,
      bakerloo: 2,
    });
  });

  it("skips empty / undefined slots in the list", () => {
    const props = resolveArrivalsProps(
      base({ rows: [6, undefined, 2] }),
      HOME_RAIL_LINES,
    );
    assert.deepEqual(props.pageSizeByLine, {
      central: 6,
      bakerloo: 2,
    });
  });

  it("explicit order omitting a serving line keeps it after with default rows", () => {
    const props = resolveArrivalsProps(
      base({
        rows: [6, 2],
        lineOrder: ["victoria", "central"],
      }),
      HOME_RAIL_LINES,
    );
    assert.deepEqual(props.pageSizeByLine, {
      victoria: 6,
      central: 2,
    });
    // bakerloo present in lines seed, not in pageSizeByLine → component default
    assert.ok(props.lines?.some((l) => l.lineId === "bakerloo"));
  });
});
