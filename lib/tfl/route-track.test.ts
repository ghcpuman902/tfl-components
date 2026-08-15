import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CABLE_CAR_DIAGRAM_COLOR,
  resolveDiagramLineColor,
  resolveDiagramLineCssColor,
  resolveRouteTrackStyle,
  routeTrackHeightUnits,
  routeTrackRailCount,
  SIMPLE_LINE_STRIP_IDS,
} from "@/lib/tfl/route-track";
import { UNDERGROUND_LINE_COLOURS } from "@/lib/tfl/brand-colours";

describe("route-track", () => {
  it("maps cable car to triple rails and map red", () => {
    assert.equal(resolveRouteTrackStyle("london-cable-car"), "cable-car");
    assert.equal(routeTrackRailCount("cable-car"), 3);
    assert.equal(routeTrackHeightUnits("cable-car"), 1.65);
    assert.equal(
      resolveDiagramLineColor("london-cable-car"),
      CABLE_CAR_DIAGRAM_COLOR,
    );
    assert.equal(
      CABLE_CAR_DIAGRAM_COLOR,
      UNDERGROUND_LINE_COLOURS.central.hex,
    );
  });

  it("maps Overground / Elizabeth to parallel double", () => {
    assert.equal(resolveRouteTrackStyle("liberty"), "parallel");
    assert.equal(resolveRouteTrackStyle("elizabeth"), "parallel");
    assert.equal(routeTrackRailCount("parallel"), 2);
    assert.equal(routeTrackHeightUnits("parallel"), 0.99);
  });

  it("keeps Tube corridors solid", () => {
    assert.equal(resolveRouteTrackStyle("victoria"), "solid");
    assert.equal(routeTrackHeightUnits("solid"), 1);
  });

  it("resolves theme-aware CSS vars for known lines", () => {
    assert.equal(resolveDiagramLineCssColor("victoria"), "var(--tfl-line-victoria)");
    assert.equal(resolveDiagramLineCssColor("northern"), "var(--tfl-line-northern)");
    assert.equal(resolveDiagramLineCssColor("elizabeth"), "var(--tfl-mode-elizabeth)");
    assert.equal(resolveDiagramLineCssColor("london-cable-car"), null);
  });

  it("lists simple non-branch demo lines", () => {
    assert.deepEqual([...SIMPLE_LINE_STRIP_IDS], [
      "waterloo-city",
      "jubilee",
      "piccadilly",
      "victoria",
      "liberty",
      "london-cable-car",
    ]);
  });
});
