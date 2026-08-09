import {
  assertValidSchematic,
  type LineSchematic,
  type SchematicEdge,
  type SchematicNode,
} from "@/lib/tfl/line-schematic";

const n = (
  id: string,
  name: string,
  lane: number,
  pos: number,
  kind: SchematicNode["kind"] = "stop",
  branchIds?: readonly string[],
  stationKey?: string,
): SchematicNode => ({
  id,
  name,
  lane,
  pos,
  kind,
  branchIds,
  ...(stationKey ? { stationKey } : {}),
});

const chain = (
  ids: readonly string[],
  branchId: string,
): SchematicEdge[] => {
  const edges: SchematicEdge[] = [];
  for (let i = 0; i < ids.length - 1; i += 1) {
    edges.push({ from: ids[i]!, to: ids[i + 1]!, branchId });
  }
  return edges;
};

const BRANCHES = [
  { id: "high-barnet", name: "High Barnet" },
  { id: "mill-hill-east", name: "Mill Hill East" },
  { id: "edgware", name: "Edgware" },
  { id: "bank", name: "Bank" },
  { id: "charing-cross", name: "Charing Cross" },
  { id: "morden", name: "Morden" },
  { id: "battersea", name: "Battersea" },
] as const;

/**
 * Horizontal Northern layout (High Barnet / Edgware → Morden along `pos`).
 *
 * Lanes:
 *  -1 Mill Hill East spur (Bezier into Finchley — never same pos / 90°)
 *   0 High Barnet → Bank → Morden (main)
 *   1 Edgware → Mornington/CX → Battersea
 *
 * Duplicate Euston: `euston-bank` (lane 0) + `euston-cx` (lane 1).
 */
export const NORTHERN_LINE_SCHEMATIC_HORIZONTAL: LineSchematic = {
  lineId: "northern",
  lineName: "Northern",
  orientation: "horizontal",
  branches: BRANCHES,
  nodes: [
    // —— High Barnet branch (lane 0) ——
    n("high-barnet", "High Barnet", 0, 0, "terminus", ["high-barnet"]),
    n("totteridge-whetstone", "Totteridge & Whetstone", 0, 1, "stop", [
      "high-barnet",
    ]),
    n("woodside-park", "Woodside Park", 0, 2, "stop", ["high-barnet"]),
    n("west-finchley", "West Finchley", 0, 3, "stop", ["high-barnet"]),
    n("finchley-central", "Finchley Central", 0, 4, "interchange", [
      "high-barnet",
      "mill-hill-east",
    ]),
    n("east-finchley", "East Finchley", 0, 5, "stop", ["high-barnet"]),
    n("highgate", "Highgate", 0, 6, "stop", ["high-barnet"]),
    n("archway", "Archway", 0, 7, "stop", ["high-barnet"]),
    n("tufnell-park", "Tufnell Park", 0, 8, "stop", ["high-barnet"]),
    n("kentish-town", "Kentish Town", 0, 9, "interchange", ["high-barnet"]),

    // —— Mill Hill East spur (lane -1, into Finchley) ——
    // MUST stay off Finchley’s pos. Same pos → pure 90° stub (forbidden).
    // Half-station before Finchley → Bezier with real main-axis span.
    n("mill-hill-east", "Mill Hill East", -1, 3.5, "terminus", [
      "mill-hill-east",
    ]),

    // —— Edgware branch (lane 1) ——
    n("edgware", "Edgware", 1, 1, "terminus", ["edgware"]),
    n("burnt-oak", "Burnt Oak", 1, 2, "stop", ["edgware"]),
    n("colindale", "Colindale", 1, 3, "stop", ["edgware"]),
    n("hendon-central", "Hendon Central", 1, 4, "stop", ["edgware"]),
    n("brent-cross", "Brent Cross", 1, 5, "stop", ["edgware"]),
    n("golders-green", "Golders Green", 1, 6, "stop", ["edgware"]),
    n("hampstead", "Hampstead", 1, 7, "stop", ["edgware"]),
    n("belsize-park", "Belsize Park", 1, 8, "stop", ["edgware"]),
    n("chalk-farm", "Chalk Farm", 1, 9, "stop", ["edgware"]),

    n("camden-town", "Camden Town", 0, 10, "interchange", [
      "high-barnet",
      "edgware",
      "bank",
      "charing-cross",
    ]),

    n("mornington-crescent", "Mornington Crescent", 1, 11, "stop", [
      "charing-cross",
    ]),
    n(
      "euston-bank",
      "Euston",
      0,
      12,
      "interchange",
      ["bank"],
      "euston",
    ),
    n(
      "euston-cx",
      "Euston",
      1,
      12,
      "interchange",
      ["charing-cross"],
      "euston",
    ),

    // —— Bank branch (lane 0) ——
    n("kings-cross-st-pancras", "King's Cross St. Pancras", 0, 13, "interchange", [
      "bank",
    ]),
    n("angel", "Angel", 0, 14, "stop", ["bank"]),
    n("old-street", "Old Street", 0, 15, "interchange", ["bank"]),
    n("moorgate", "Moorgate", 0, 16, "interchange", ["bank"]),
    n("bank", "Bank", 0, 17, "interchange", ["bank"]),
    n("london-bridge", "London Bridge", 0, 18, "interchange", ["bank"]),
    n("borough", "Borough", 0, 19, "stop", ["bank"]),
    n("elephant-castle", "Elephant & Castle", 0, 20, "interchange", ["bank"]),

    // —— Charing Cross branch (lane 1) ——
    n("warren-street", "Warren Street", 1, 13, "interchange", [
      "charing-cross",
    ]),
    n("goodge-street", "Goodge Street", 1, 14, "stop", ["charing-cross"]),
    n("tottenham-court-road", "Tottenham Court Road", 1, 15, "interchange", [
      "charing-cross",
    ]),
    n("leicester-square", "Leicester Square", 1, 16, "interchange", [
      "charing-cross",
    ]),
    n("charing-cross", "Charing Cross", 1, 17, "interchange", [
      "charing-cross",
    ]),
    n("embankment", "Embankment", 1, 18, "interchange", ["charing-cross"]),
    n("waterloo", "Waterloo", 1, 19, "interchange", ["charing-cross"]),

    n("kennington", "Kennington", 0, 21, "interchange", [
      "bank",
      "charing-cross",
      "morden",
      "battersea",
    ]),

    // —— Morden (lane 0) ——
    n("oval", "Oval", 0, 22, "stop", ["morden"]),
    n("stockwell", "Stockwell", 0, 23, "interchange", ["morden"]),
    n("clapham-north", "Clapham North", 0, 24, "stop", ["morden"]),
    n("clapham-common", "Clapham Common", 0, 25, "stop", ["morden"]),
    n("clapham-south", "Clapham South", 0, 26, "stop", ["morden"]),
    n("balham", "Balham", 0, 27, "interchange", ["morden"]),
    n("tooting-bec", "Tooting Bec", 0, 28, "stop", ["morden"]),
    n("tooting-broadway", "Tooting Broadway", 0, 29, "stop", ["morden"]),
    n("colliers-wood", "Colliers Wood", 0, 30, "stop", ["morden"]),
    n("south-wimbledon", "South Wimbledon", 0, 31, "stop", ["morden"]),
    n("morden", "Morden", 0, 32, "terminus", ["morden"]),

    // —— Battersea (lane 1) ——
    n("nine-elms", "Nine Elms", 1, 22, "stop", ["battersea"]),
    n("battersea-power-station", "Battersea Power Station", 1, 23, "terminus", [
      "battersea",
    ]),
  ],
  edges: [
    ...chain(
      [
        "high-barnet",
        "totteridge-whetstone",
        "woodside-park",
        "west-finchley",
        "finchley-central",
        "east-finchley",
        "highgate",
        "archway",
        "tufnell-park",
        "kentish-town",
        "camden-town",
      ],
      "high-barnet",
    ),
    ...chain(["mill-hill-east", "finchley-central"], "mill-hill-east"),
    ...chain(
      [
        "edgware",
        "burnt-oak",
        "colindale",
        "hendon-central",
        "brent-cross",
        "golders-green",
        "hampstead",
        "belsize-park",
        "chalk-farm",
        "camden-town",
      ],
      "edgware",
    ),
    { from: "camden-town", to: "euston-bank", branchId: "bank" },
    ...chain(
      [
        "euston-bank",
        "kings-cross-st-pancras",
        "angel",
        "old-street",
        "moorgate",
        "bank",
        "london-bridge",
        "borough",
        "elephant-castle",
        "kennington",
      ],
      "bank",
    ),
    ...chain(
      [
        "camden-town",
        "mornington-crescent",
        "euston-cx",
        "warren-street",
        "goodge-street",
        "tottenham-court-road",
        "leicester-square",
        "charing-cross",
        "embankment",
        "waterloo",
        "kennington",
      ],
      "charing-cross",
    ),
    ...chain(
      [
        "kennington",
        "oval",
        "stockwell",
        "clapham-north",
        "clapham-common",
        "clapham-south",
        "balham",
        "tooting-bec",
        "tooting-broadway",
        "colliers-wood",
        "south-wimbledon",
        "morden",
      ],
      "morden",
    ),
    ...chain(
      ["kennington", "nine-elms", "battersea-power-station"],
      "battersea",
    ),
  ],
};

assertValidSchematic(NORTHERN_LINE_SCHEMATIC_HORIZONTAL);

/** @deprecated Use `NORTHERN_LINE_SCHEMATIC_HORIZONTAL`. */
export const NORTHERN_LINE_SCHEMATIC = NORTHERN_LINE_SCHEMATIC_HORIZONTAL;
