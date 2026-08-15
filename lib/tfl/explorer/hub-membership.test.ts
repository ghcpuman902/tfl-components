import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collapseExplorerPointsToHubs,
  type ExplorerPoint,
} from "@/lib/tfl/explorer-point-normalise";
import {
  getExplorerHubMembership,
  lookupExplorerArrivalsStopIds,
} from "./hub-membership";

describe("getExplorerHubMembership", () => {
  it("lists Liverpool Street tube and rail siblings, not the duplicate Elizabeth child", () => {
    const hub = getExplorerHubMembership("940GZZLULVT");
    assert.ok(hub);
    assert.equal(hub.isHub, true);
    assert.equal(hub.hubId, "HUBLST");
    const ids = hub.members.map((member) => member.id);
    assert.ok(ids.includes("940GZZLULVT"));
    assert.ok(ids.includes("910GLIVST"));
    assert.ok(!ids.includes("910GLIVSTLL"));
    assert.equal(hub.lineMemberIds.central, "940GZZLULVT");
    assert.equal(hub.lineMemberIds.elizabeth, "910GLIVST");
    assert.equal(hub.lineMemberIds.weaver, "910GLIVST");
  });

  it("does not treat Waterloo National Rail as an arrivals sibling", () => {
    const hub = getExplorerHubMembership("940GZZLUWLO");
    assert.ok(hub);
    assert.equal(hub.isHub, false);
    assert.deepEqual(hub.arrivalsStopIds, ["940GZZLUWLO"]);
  });

  it("returns null for an unknown id", () => {
    assert.equal(getExplorerHubMembership("not-a-stop"), null);
  });
});

describe("lookupExplorerArrivalsStopIds", () => {
  it("expands Liverpool Street Underground to the rail sibling", () => {
    const ids = lookupExplorerArrivalsStopIds("940GZZLULVT");
    assert.ok(ids.includes("940GZZLULVT"));
    assert.ok(ids.includes("910GLIVST"));
  });

  it("returns the input id for a single-member stop", () => {
    assert.deepEqual(lookupExplorerArrivalsStopIds("910GWAPPING"), [
      "910GWAPPING",
    ]);
  });
});

describe("collapseExplorerPointsToHubs", () => {
  const liverpool: ExplorerPoint = {
    id: "940GZZLULVT",
    name: "Liverpool Street",
    kind: "stopPoint",
    hubId: "HUBLST",
    aliasIds: ["910GLIVST", "HUBLST"],
  };

  it("keeps one catalog row when search returns both siblings", () => {
    const collapsed = collapseExplorerPointsToHubs(
      [
        {
          id: "910GLIVST",
          name: "London Liverpool Street Rail Station",
          kind: "stopPoint",
        },
        {
          id: "940GZZLULVT",
          name: "Liverpool Street Underground Station",
          kind: "stopPoint",
        },
      ],
      [liverpool],
    );
    assert.equal(collapsed.length, 1);
    assert.equal(collapsed[0]?.id, "940GZZLULVT");
  });

  it("keeps a live hit that is not in the catalog", () => {
    const live: ExplorerPoint = {
      id: "940GZZLUOXC",
      name: "Oxford Circus",
      kind: "stopPoint",
    };
    const collapsed = collapseExplorerPointsToHubs([live], [liverpool]);
    assert.deepEqual(
      collapsed.map((point) => point.id),
      ["940GZZLUOXC"],
    );
  });
});
