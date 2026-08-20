/**
 * One demo Junction per taxonomy type in `junction-grammar.ts`, grounded in
 * real London rail geography where a safe, well-known example exists.
 *
 * These are teaching examples for the grammar, not an operational track
 * diagram: exact permitted movements are simplified so each type reads
 * clearly in isolation (see `docs/coding-style.md` composition contract —
 * renderers must not infer connectivity the grammar doesn't declare, and
 * neither should these fixtures invent precision the source data doesn't
 * have yet).
 */
import { symmetricMovements, type Junction } from "./junction-grammar"

export const JUNCTION_EXAMPLES: Junction[] = [
  {
    id: "linear-manor-park",
    type: "linear",
    label: "Manor Park",
    legs: [
      { id: "west", label: "Stratford", bearingDeg: 270 },
      { id: "east", label: "Ilford", bearingDeg: 90 },
    ],
    movements: symmetricMovements([["west", "east"]]),
    notes:
      "A plain through station: one line in, the same line out. The control case every junction type below is judged against.",
    londonExamples: ["Manor Park (Elizabeth line)"],
  },
  {
    id: "y-junction-stockley",
    type: "y-junction",
    label: "Heathrow spur junction",
    legs: [
      { id: "paddington", label: "Paddington", bearingDeg: 90 },
      { id: "heathrow", label: "Heathrow T2&3/T4/T5", bearingDeg: 180 },
      { id: "reading", label: "Reading / Maidenhead", bearingDeg: 270 },
    ],
    movements: symmetricMovements([
      ["paddington", "heathrow"],
      ["paddington", "reading"],
    ]),
    notes:
      "Confirmed against every OSM Elizabeth line route relation: Heathrow trains and Reading/Maidenhead trains both call towards Paddington, but no service runs Heathrow ↔ Reading without changing.",
    londonExamples: [
      "Heathrow spur leaving the Great Western main line near Hayes & Harlington",
    ],
  },
  {
    id: "through-fork-whitechapel",
    type: "through-fork",
    label: "Whitechapel branch fork",
    legs: [
      { id: "west", label: "Liverpool St / Paddington", bearingDeg: 270 },
      { id: "stratford", label: "Stratford / Shenfield", bearingDeg: 45 },
      {
        id: "canary-wharf",
        label: "Canary Wharf / Abbey Wood",
        bearingDeg: 135,
      },
    ],
    movements: symmetricMovements([
      ["west", "stratford"],
      ["west", "canary-wharf"],
    ]),
    notes:
      "Both onward branches are equally 'primary' — unlike the Heathrow spur, neither Stratford nor Canary Wharf reads as the secondary branch. No relation runs Stratford ↔ Canary Wharf directly.",
    londonExamples: [
      "Elizabeth line fork east of Whitechapel toward Stratford vs Canary Wharf/Abbey Wood",
    ],
  },
  {
    id: "merge-heathrow-convergence",
    type: "merge",
    label: "Heathrow spur junction, eastbound",
    legs: [
      { id: "heathrow", label: "Heathrow T2&3/T4/T5", bearingDeg: 180 },
      { id: "reading", label: "Reading / Maidenhead", bearingDeg: 270 },
      { id: "paddington", label: "Paddington", bearingDeg: 90 },
    ],
    movements: symmetricMovements([
      ["heathrow", "paddington"],
      ["reading", "paddington"],
    ]),
    notes:
      "The same physical junction as the y-junction example, described from the converging direction: two service paths join one outgoing leg rather than one splitting into two.",
    londonExamples: [
      "Heathrow spur leaving the Great Western main line, viewed towards Paddington",
    ],
  },
  {
    id: "crossing-dlr-geml",
    type: "crossing",
    label: "DLR over Great Eastern main line",
    legs: [
      { id: "dlr-west", label: "DLR westbound", bearingDeg: 270 },
      { id: "dlr-east", label: "DLR eastbound", bearingDeg: 90 },
      { id: "geml-north", label: "GEML towards Stratford", bearingDeg: 45 },
      { id: "geml-south", label: "GEML towards Liverpool St", bearingDeg: 225 },
    ],
    movements: [],
    notes:
      "Different networks, different gauges, no shared track — the DLR viaduct simply passes over the main line near Stratford. Zero permitted movements is the point: geometry crosses, connectivity doesn't exist.",
    londonExamples: [
      "DLR viaduct crossing the Great Eastern main line near Stratford",
    ],
  },
  {
    id: "flat-junction-earls-court",
    type: "flat-junction",
    label: "Earls Court flat junction",
    legs: [
      { id: "district-east", label: "District line east", bearingDeg: 90 },
      { id: "kensington", label: "Kensington (Olympia)", bearingDeg: 0 },
      { id: "wimbledon", label: "Wimbledon branch", bearingDeg: 200 },
      {
        id: "richmond-ealing",
        label: "Richmond / Ealing Broadway branches",
        bearingDeg: 270,
      },
    ],
    movements: symmetricMovements([
      ["district-east", "wimbledon"],
      ["district-east", "richmond-ealing"],
      ["kensington", "wimbledon"],
    ]),
    notes:
      "Several District line branches cross at grade with only a defined subset of moves signalled through — not every approach connects to every other. Simplified for the demo.",
    londonExamples: ["Earls Court (District line branch layout)"],
  },
  {
    id: "diamond-edgware-road",
    type: "diamond",
    label: "Edgware Road area",
    legs: [
      {
        id: "circle-north",
        label: "Circle/H&C towards Baker St",
        bearingDeg: 45,
      },
      {
        id: "circle-south",
        label: "Circle/District towards Paddington",
        bearingDeg: 225,
      },
      {
        id: "bakerloo-north",
        label: "Bakerloo towards Marylebone",
        bearingDeg: 315,
      },
      {
        id: "bakerloo-south",
        label: "Bakerloo towards Paddington",
        bearingDeg: 135,
      },
    ],
    movements: symmetricMovements([
      ["circle-north", "circle-south"],
      ["bakerloo-north", "bakerloo-south"],
      ["circle-north", "bakerloo-south"],
    ]),
    notes:
      "Four approaches with both through and turning moves possible — the diamond shape alone doesn't say which; each turning move has to be listed explicitly. Simplified for the demo.",
    londonExamples: [
      "Edgware Road (Circle/Hammersmith & City/Bakerloo layout)",
    ],
  },
  {
    id: "wye-depot-triangle",
    type: "wye",
    label: "Depot reversing triangle",
    legs: [
      { id: "a", label: "Running line A", bearingDeg: 30 },
      { id: "b", label: "Running line B", bearingDeg: 150 },
      { id: "c", label: "Depot throat", bearingDeg: 270 },
    ],
    movements: symmetricMovements([
      ["a", "b"],
      ["a", "c"],
      ["b", "c"],
    ]),
    notes:
      "A true wye: every pairwise move is possible, including the A↔B reversal that most passenger Y-junctions never use in service. Common at depot throats, engineering movements only.",
    londonExamples: [
      "Reversing triangles at depot throats (e.g. Neasden, Ruislip) — engineering moves, not scheduled service",
    ],
  },
  {
    id: "loop-kennington",
    type: "loop",
    label: "Kennington loop",
    legs: [
      {
        id: "charing-cross-in",
        label: "from Charing Cross branch",
        bearingDeg: 0,
      },
      { id: "bank-in", label: "from Bank branch", bearingDeg: 45 },
      { id: "morden", label: "towards Morden", bearingDeg: 180 },
      {
        id: "charing-cross-out",
        label: "to Charing Cross branch",
        bearingDeg: 315,
      },
    ],
    movements: symmetricMovements([
      ["charing-cross-in", "morden"],
      ["bank-in", "morden"],
      ["charing-cross-in", "charing-cross-out"],
    ]),
    rejoinsLegId: "charing-cross-out",
    notes:
      "Northern line trains terminating from the Charing Cross branch reverse via the loop back onto the Charing Cross branch, rather than reversing in a platform — one circuit, not a dead end.",
    londonExamples: ["Kennington loop (Northern line)"],
  },
  {
    id: "spur-heathrow-t5",
    type: "spur",
    label: "Heathrow Terminal 5 branch",
    legs: [
      { id: "t123", label: "Heathrow T2&3 / central London", bearingDeg: 90 },
      { id: "t4-loop", label: "Heathrow T4 loop", bearingDeg: 200 },
      {
        id: "t5",
        label: "Heathrow Terminal 5",
        bearingDeg: 270,
        terminal: true,
      },
    ],
    movements: symmetricMovements([
      ["t123", "t4-loop"],
      ["t123", "t5"],
    ]),
    notes:
      "T5 is a true physical dead end — there is no track beyond it to reconnect anywhere, unlike a Y-junction leg that merely isn't used by a service pattern.",
    londonExamples: ["Heathrow Terminal 5 branch (Piccadilly line)"],
  },
  {
    id: "multi-branch-willesden",
    type: "multi-branch",
    label: "Willesden Junction area",
    legs: [
      { id: "nll-east", label: "North London Line east", bearingDeg: 90 },
      { id: "nll-west", label: "North London Line west", bearingDeg: 270 },
      { id: "wll-north", label: "West London Line north", bearingDeg: 0 },
      { id: "wll-south", label: "West London Line south", bearingDeg: 180 },
      { id: "watford-dc", label: "Watford DC line", bearingDeg: 315 },
    ],
    movements: symmetricMovements([
      ["nll-east", "nll-west"],
      ["wll-north", "wll-south"],
      ["nll-west", "wll-south"],
      ["watford-dc", "nll-west"],
    ]),
    notes:
      "Generalises the wye/fork family past three legs. Several Overground routes converge here; exact signalled moves are simplified for the demo.",
    londonExamples: [
      "Willesden Junction (North London Line / West London Line / Watford DC line)",
    ],
  },
  {
    id: "grade-separated-camden-town",
    type: "grade-separated",
    label: "Camden Town flying junction",
    legs: [
      { id: "cx-north", label: "Charing Cross branch, north", bearingDeg: 0 },
      { id: "cx-south", label: "Charing Cross branch, south", bearingDeg: 180 },
      { id: "bank-north", label: "Bank branch, north", bearingDeg: 20 },
      { id: "bank-south", label: "Bank branch, south", bearingDeg: 200 },
    ],
    movements: [
      { from: "cx-north", to: "cx-south" },
      { from: "cx-south", to: "cx-north" },
      { from: "bank-north", to: "bank-south" },
      { from: "bank-south", to: "bank-north" },
      { from: "bank-north", to: "cx-south", gradeSeparated: true },
      { from: "cx-south", to: "bank-north", gradeSeparated: true },
    ],
    notes:
      "The Bank branch dives under the Charing Cross branch so that move can happen without crossing opposing traffic at grade. Same movement algebra as a flat junction — the flag is on how it's built, not a new shape.",
    londonExamples: ["Camden Town flying junction (Northern line)"],
  },
]

export const junctionExampleFor = (
  type: Junction["type"]
): Junction | undefined =>
  JUNCTION_EXAMPLES.find((junction) => junction.type === type)
