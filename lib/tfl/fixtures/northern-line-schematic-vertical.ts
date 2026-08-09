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
 * Vertical Northern layout (north → south along `pos`).
 *
 * Lanes (left → right):
 *  -1 Edgware → Chalk Farm → Camden
 *   0 Mill Hill East spur (Bezier into Finchley — never same pos / 90°)
 *   1 Main spine: High Barnet → Camden → Mornington → Euston(CX) → Waterloo → Kennington → Morden
 *   2 Bank: Euston(Bank) → King’s Cross → … → Kennington; Battersea south of Kennington
 */
export const NORTHERN_LINE_SCHEMATIC_VERTICAL: LineSchematic = {
  lineId: "northern",
  lineName: "Northern",
  orientation: "vertical",
  branches: BRANCHES,
  nodes: [
    // —— High Barnet → Camden (lane 1, main spine) ——
    n("high-barnet", "High Barnet", 1, 0, "terminus", ["high-barnet"]),
    n("totteridge-whetstone", "Totteridge & Whetstone", 1, 1, "stop", [
      "high-barnet",
    ]),
    n("woodside-park", "Woodside Park", 1, 2, "stop", ["high-barnet"]),
    n("west-finchley", "West Finchley", 1, 3, "stop", ["high-barnet"]),
    n("finchley-central", "Finchley Central", 1, 4, "interchange", [
      "high-barnet",
      "mill-hill-east",
    ]),
    n("east-finchley", "East Finchley", 1, 5, "stop", ["high-barnet"]),
    n("highgate", "Highgate", 1, 6, "stop", ["high-barnet"]),
    n("archway", "Archway", 1, 7, "stop", ["high-barnet"]),
    n("tufnell-park", "Tufnell Park", 1, 8, "stop", ["high-barnet"]),
    n("kentish-town", "Kentish Town", 1, 9, "interchange", ["high-barnet"]),

    // —— Mill Hill East spur (lane 0, between Edgware and HB) ——
    // MUST stay off Finchley’s pos. Same pos → pure 90° stub (forbidden).
    // Half-station before Finchley → Bezier with real main-axis span.
    n("mill-hill-east", "Mill Hill East", 0, 3.5, "terminus", [
      "mill-hill-east",
    ]),

    // —— Edgware → Camden (lane -1, left) ——
    n("edgware", "Edgware", -1, 1, "terminus", ["edgware"]),
    n("burnt-oak", "Burnt Oak", -1, 2, "stop", ["edgware"]),
    n("colindale", "Colindale", -1, 3, "stop", ["edgware"]),
    n("hendon-central", "Hendon Central", -1, 4, "stop", ["edgware"]),
    n("brent-cross", "Brent Cross", -1, 5, "stop", ["edgware"]),
    n("golders-green", "Golders Green", -1, 6, "stop", ["edgware"]),
    n("hampstead", "Hampstead", -1, 7, "stop", ["edgware"]),
    n("belsize-park", "Belsize Park", -1, 8, "stop", ["edgware"]),
    n("chalk-farm", "Chalk Farm", -1, 9, "stop", ["edgware"]),

    n("camden-town", "Camden Town", 1, 10, "interchange", [
      "high-barnet",
      "edgware",
      "bank",
      "charing-cross",
    ]),

    // —— CX spine through Mornington + Euston ——
    n("mornington-crescent", "Mornington Crescent", 1, 11, "stop", [
      "charing-cross",
    ]),
    n(
      "euston-cx",
      "Euston",
      1,
      12,
      "interchange",
      ["charing-cross"],
      "euston",
    ),

    // —— Duplicate Euston on Bank branch (lane 2) ——
    n("euston-bank", "Euston", 2, 12, "interchange", ["bank"], "euston"),

    // —— Bank branch (lane 2) ——
    n("kings-cross-st-pancras", "King's Cross St. Pancras", 2, 13, "interchange", [
      "bank",
    ]),
    n("angel", "Angel", 2, 14, "stop", ["bank"]),
    n("old-street", "Old Street", 2, 15, "interchange", ["bank"]),
    n("moorgate", "Moorgate", 2, 16, "interchange", ["bank"]),
    n("bank", "Bank", 2, 17, "interchange", ["bank"]),
    n("london-bridge", "London Bridge", 2, 18, "interchange", ["bank"]),
    n("borough", "Borough", 2, 19, "stop", ["bank"]),
    n("elephant-castle", "Elephant & Castle", 2, 20, "interchange", ["bank"]),

    // —— Charing Cross branch continues on spine (lane 1) ——
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

    // —— Kennington rejoin on spine ——
    n("kennington", "Kennington", 1, 21, "interchange", [
      "bank",
      "charing-cross",
      "morden",
      "battersea",
    ]),

    // —— Morden (lane 1) ——
    n("oval", "Oval", 1, 22, "stop", ["morden"]),
    n("stockwell", "Stockwell", 1, 23, "interchange", ["morden"]),
    n("clapham-north", "Clapham North", 1, 24, "stop", ["morden"]),
    n("clapham-common", "Clapham Common", 1, 25, "stop", ["morden"]),
    n("clapham-south", "Clapham South", 1, 26, "stop", ["morden"]),
    n("balham", "Balham", 1, 27, "interchange", ["morden"]),
    n("tooting-bec", "Tooting Bec", 1, 28, "stop", ["morden"]),
    n("tooting-broadway", "Tooting Broadway", 1, 29, "stop", ["morden"]),
    n("colliers-wood", "Colliers Wood", 1, 30, "stop", ["morden"]),
    n("south-wimbledon", "South Wimbledon", 1, 31, "stop", ["morden"]),
    n("morden", "Morden", 1, 32, "terminus", ["morden"]),

    // —— Battersea (lane 2) ——
    n("nine-elms", "Nine Elms", 2, 22, "stop", ["battersea"]),
    n("battersea-power-station", "Battersea Power Station", 2, 23, "terminus", [
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
    // Bank skips Mornington — Camden → Euston (Bank)
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
    // CX spine: Camden → Mornington → Euston (CX) → … → Kennington
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

assertValidSchematic(NORTHERN_LINE_SCHEMATIC_VERTICAL);
