import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BOARD_VIEW_PATH,
  DEFAULT_BOARD_CONFIG,
  buildBoardHref,
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

  it("round-trips with parseBoardConfig", () => {
    const original = {
      stop: "940GZZLUOXC",
      stopName: "Oxford Circus",
      mode: "touch" as const,
      fit: "fill" as const,
      key: "secretkey",
    };
    const href = buildBoardHref(original);
    const hash = href.slice(BOARD_VIEW_PATH.length);
    const parsed = parseBoardConfig(hash);
    assert.deepEqual(parsed, original);
  });
});
