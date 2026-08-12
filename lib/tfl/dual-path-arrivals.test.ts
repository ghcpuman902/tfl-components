import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  selectArrivalsDataPath,
  shouldPausePollingForVisibility,
} from "./dual-path-arrivals";

describe("selectArrivalsDataPath", () => {
  it("uses site path when empty", () => {
    assert.equal(selectArrivalsDataPath("empty"), "site");
  });

  it("uses site path while validating (until ready)", () => {
    assert.equal(selectArrivalsDataPath("validating"), "site");
  });

  it("uses user path when ready", () => {
    assert.equal(selectArrivalsDataPath("ready"), "user");
  });

  it("stays on user path when invalid (no site-key fallback)", () => {
    assert.equal(selectArrivalsDataPath("invalid"), "user");
  });
});

describe("shouldPausePollingForVisibility", () => {
  it("pauses when hidden", () => {
    assert.equal(shouldPausePollingForVisibility("hidden"), true);
  });

  it("does not pause when visible", () => {
    assert.equal(shouldPausePollingForVisibility("visible"), false);
  });
});
