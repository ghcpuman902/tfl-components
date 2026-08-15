import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BOARD_VIEW_PATH,
  DEFAULT_BOARD_CONFIG,
  buildBoardHref,
  describeBoardHrefSegments,
  parseBoardConfig,
} from "./board-url-state";

describe("parseBoardConfig", () => {
  it("returns defaults for empty input", () => {
    assert.deepEqual(parseBoardConfig(""), {
      ...DEFAULT_BOARD_CONFIG,
      key: undefined,
      stop: undefined,
      stopName: undefined,
    });
    assert.deepEqual(parseBoardConfig(), {
      ...DEFAULT_BOARD_CONFIG,
      key: undefined,
      stop: undefined,
      stopName: undefined,
    });
  });

  it("strips a leading hash", () => {
    const config = parseBoardConfig("#stop=940GZZLUOXC&stopName=Oxford+Circus");
    assert.equal(config.stop, "940GZZLUOXC");
    assert.equal(config.stopName, "Oxford Circus");
  });

  it("reads the key from the hash only", () => {
    const config = parseBoardConfig("stop=940GZZLUOXC&key=abc123");
    assert.equal(config.key, "abc123");
    assert.equal(config.stop, "940GZZLUOXC");
  });

  it("falls back on invalid mode and fit", () => {
    const config = parseBoardConfig("mode=voice&fit=stretch");
    assert.equal(config.mode, "static");
    assert.equal(config.fit, "static");
  });

  it("accepts reserved coming-soon values", () => {
    const config = parseBoardConfig("mode=touch&fit=fill");
    assert.equal(config.mode, "touch");
    assert.equal(config.fit, "fill");
  });

  it("treats empty stop, stopName, and key as undefined", () => {
    const config = parseBoardConfig("stop=%20&stopName=&key=");
    assert.equal(config.stop, undefined);
    assert.equal(config.stopName, undefined);
    assert.equal(config.key, undefined);
  });

  it("accepts URLSearchParams", () => {
    const params = new URLSearchParams("stop=940GZZLUOXC&mode=mouse");
    const config = parseBoardConfig(params);
    assert.equal(config.stop, "940GZZLUOXC");
    assert.equal(config.mode, "mouse");
  });

  it("ignores unknown params", () => {
    const config = parseBoardConfig("stop=940GZZLUOXC&future=yes&s.filter=tube");
    assert.equal(config.stop, "940GZZLUOXC");
    assert.deepEqual(config.arrivals, {});
  });

  it("parses scalar a.rows", () => {
    const config = parseBoardConfig("a.rows=6");
    assert.equal(config.arrivals.rows, 6);
  });

  it("parses a.rows=0 as show-all", () => {
    const config = parseBoardConfig("a.rows=0");
    assert.equal(config.arrivals.rows, 0);
  });

  it("clamps a.rows above 16", () => {
    const config = parseBoardConfig("a.rows=99");
    assert.equal(config.arrivals.rows, 16);
  });

  it("falls back invalid scalar a.rows", () => {
    assert.equal(parseBoardConfig("a.rows=-1").arrivals.rows, undefined);
    assert.equal(parseBoardConfig("a.rows=2.5").arrivals.rows, undefined);
    assert.equal(parseBoardConfig("a.rows=abc").arrivals.rows, undefined);
  });

  it("parses positional a.rows with empty slots", () => {
    const config = parseBoardConfig("a.rows=6,,2");
    assert.deepEqual(config.arrivals.rows, [6, undefined, 2]);
  });

  it("parses a.lines with normalize, dedupe, drop unknown", () => {
    const config = parseBoardConfig(
      "a.lines=Victoria,central,victoria,not-a-line,bakerloo",
    );
    assert.deepEqual(config.arrivals.lineOrder, [
      "victoria",
      "central",
      "bakerloo",
    ]);
  });
});

describe("buildBoardHref", () => {
  it("returns bare path for defaults", () => {
    assert.equal(buildBoardHref({}), BOARD_VIEW_PATH);
  });

  it("omits default mode and fit", () => {
    assert.equal(
      buildBoardHref({ mode: "static", fit: "static", stop: "940GZZLUOXC" }),
      `${BOARD_VIEW_PATH}#stop=940GZZLUOXC`,
    );
  });

  it("includes non-default values and the key", () => {
    const href = buildBoardHref({
      stop: "940GZZLUOXC",
      stopName: "Oxford Circus",
      mode: "mouse",
      fit: "fill",
      key: "abc123",
    });
    assert.equal(
      href,
      `${BOARD_VIEW_PATH}#stop=940GZZLUOXC&stopName=Oxford+Circus&mode=mouse&fit=fill&key=abc123`,
    );
  });

  it("omits default scalar a.rows", () => {
    const href = buildBoardHref({
      stop: "940GZZLUOXC",
      arrivals: { rows: 3 },
    });
    assert.equal(href, `${BOARD_VIEW_PATH}#stop=940GZZLUOXC`);
  });

  it("serializes non-default scalar a.rows", () => {
    const href = buildBoardHref({
      stop: "940GZZLUOXC",
      arrivals: { rows: 6 },
    });
    assert.equal(href, `${BOARD_VIEW_PATH}#stop=940GZZLUOXC&a.rows=6`);
  });

  it("serializes positional a.rows with literal commas", () => {
    const href = buildBoardHref({
      stop: "940GZZLUOXC",
      arrivals: { rows: [6, 2, 2], lineOrder: ["victoria", "central", "bakerloo"] },
    });
    assert.equal(
      href,
      `${BOARD_VIEW_PATH}#stop=940GZZLUOXC&a.rows=6,2,2&a.lines=victoria,central,bakerloo`,
    );
  });

  it("puts the key last when arrivals settings are present", () => {
    const href = buildBoardHref({
      stop: "940GZZLUOXC",
      arrivals: { rows: 0 },
      key: "abc123",
      mode: "touch",
      fit: "fill",
    });
    assert.equal(
      href,
      `${BOARD_VIEW_PATH}#stop=940GZZLUOXC&mode=touch&fit=fill&a.rows=0&key=abc123`,
    );
  });

  it("round-trips with parseBoardConfig", () => {
    const original = {
      stop: "940GZZLUOXC",
      stopName: "Oxford Circus",
      mode: "touch" as const,
      fit: "fill" as const,
      key: "secretkey",
      arrivals: {},
    };
    const href = buildBoardHref(original);
    const hash = href.slice(BOARD_VIEW_PATH.length);
    const parsed = parseBoardConfig(hash);
    assert.deepEqual(parsed, original);
  });

  it("round-trips arrivals settings", () => {
    const original = {
      stop: "940GZZLUOXC",
      mode: "static" as const,
      fit: "static" as const,
      arrivals: {
        rows: [6, undefined, 2] as const,
        lineOrder: ["victoria", "central", "bakerloo"] as const,
      },
    };
    const href = buildBoardHref(original);
    const hash = href.slice(BOARD_VIEW_PATH.length);
    const parsed = parseBoardConfig(hash);
    assert.equal(parsed.stop, original.stop);
    assert.deepEqual(parsed.arrivals.rows, [6, undefined, 2]);
    assert.deepEqual(parsed.arrivals.lineOrder, original.arrivals.lineOrder);
  });
});

describe("describeBoardHrefSegments", () => {
  it("returns an empty list for defaults", () => {
    assert.deepEqual(describeBoardHrefSegments({}), []);
  });

  it("omits default mode, fit, and scalar a.rows", () => {
    assert.deepEqual(
      describeBoardHrefSegments({
        stop: "940GZZLUOXC",
        mode: "static",
        fit: "static",
        arrivals: { rows: 3 },
      }),
      [{ setting: "stop", text: "stop=940GZZLUOXC" }],
    );
  });

  it("lists segments in href order with literal commas", () => {
    const segments = describeBoardHrefSegments({
      stop: "940GZZLUOXC",
      stopName: "Oxford Circus",
      mode: "mouse",
      fit: "fill",
      arrivals: {
        rows: [6, 2, 2],
        lineOrder: ["victoria", "central", "bakerloo"],
      },
      key: "abc123",
    });
    assert.deepEqual(
      segments.map((segment) => segment.setting),
      ["stop", "stopName", "mode", "fit", "arrivalsRows", "arrivalsLines", "key"],
    );
    assert.deepEqual(
      segments.map((segment) => segment.text),
      [
        "stop=940GZZLUOXC",
        "stopName=Oxford+Circus",
        "mode=mouse",
        "fit=fill",
        "a.rows=6,2,2",
        "a.lines=victoria,central,bakerloo",
        "key=abc123",
      ],
    );
  });

  it("matches buildBoardHref hash exactly", () => {
    const next = {
      stop: "940GZZLUOXC",
      arrivals: { rows: 0 as const, lineOrder: ["central"] as const },
      key: "secret",
    };
    const segments = describeBoardHrefSegments(next);
    const fromSegments = `${BOARD_VIEW_PATH}#${segments
      .map((segment) => segment.text)
      .join("&")}`;
    assert.equal(fromSegments, buildBoardHref(next));
  });
});
