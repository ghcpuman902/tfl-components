/**
 * Real London junction windows for the temp research page.
 * Each case is a named station on a live line — topology, dual tracks, and
 * permitted-route constraints are cropped from OSM / TfL data at runtime.
 */
import type { TransitMode } from "@/lib/tfl/geography-types"

export type JunctionCase = {
  id: string
  name: string
  kind: string
  mode: TransitMode
  lineIds: string[]
  stationLabel: string
  radiusM: number
  hops: number
  notes: string
}

export const JUNCTION_CASES: JunctionCase[] = [
  {
    id: "manor-park",
    name: "Manor Park",
    kind: "Linear",
    mode: "elizabeth",
    lineIds: ["elizabeth"],
    stationLabel: "Manor Park",
    radiusM: 650,
    hops: 1,
    notes:
      "Control case: one corridor in, the same corridor out. Dual tracks stay parallel; the schematic should stay a straight through-move.",
  },
  {
    id: "heathrow-spur",
    name: "Heathrow spur",
    kind: "Y-junction",
    mode: "elizabeth",
    lineIds: ["elizabeth"],
    stationLabel: "Hayes & Harlington",
    radiusM: 1900,
    hops: 1,
    notes:
      "Reading / Maidenhead and Heathrow both continue toward Paddington. No passenger pattern runs Heathrow ↔ Reading.",
  },
  {
    id: "whitechapel-elizabeth",
    name: "Whitechapel",
    kind: "Through fork",
    mode: "elizabeth",
    lineIds: ["elizabeth"],
    stationLabel: "Whitechapel",
    radiusM: 1400,
    hops: 1,
    notes:
      "East of Whitechapel the Elizabeth line splits to Stratford / Shenfield and Canary Wharf / Abbey Wood. Both onward legs are primary.",
  },
  {
    id: "camden-town",
    name: "Camden Town",
    kind: "Flying junction",
    mode: "tube",
    lineIds: ["northern"],
    stationLabel: "Camden Town",
    radiusM: 800,
    hops: 1,
    notes:
      "Northern line Bank and Charing Cross branches cross here. The dual graph keeps both tracks; permitted routes are the through and flying moves OSM actually traces.",
  },
  {
    id: "kennington",
    name: "Kennington",
    kind: "Loop",
    mode: "tube",
    lineIds: ["northern"],
    stationLabel: "Kennington",
    radiusM: 900,
    hops: 1,
    notes:
      "Charing Cross trains reverse via the Kennington loop. The dual graph should show the loop as a real circuit, not a dead-end spur.",
  },
  {
    id: "earls-court",
    name: "Earl's Court",
    kind: "Flat junction",
    mode: "tube",
    lineIds: ["district"],
    stationLabel: "Earl's Court",
    radiusM: 900,
    hops: 1,
    notes:
      "District branches meet at grade. Only the movements present in OSM relations and TfL sequences are permitted — not every approach to every approach.",
  },
  {
    id: "willesden-junction",
    name: "Willesden Junction",
    kind: "Multi-branch",
    mode: "overground",
    lineIds: ["mildmay", "lioness"],
    stationLabel: "Willesden Junction",
    radiusM: 900,
    hops: 1,
    notes:
      "Mildmay (North London) and Lioness (Watford DC) share the station. Dual tracks for both lines stay in the same window.",
  },
  {
    id: "heathrow-t5",
    name: "Heathrow Terminal 5",
    kind: "Spur",
    mode: "tube",
    lineIds: ["piccadilly"],
    stationLabel: "Heathrow Airport Terminal 5",
    radiusM: 1100,
    hops: 1,
    notes:
      "T5 is a physical dead end. The T4 loop and the T2&3 corridor continue; nothing reconnects beyond T5.",
  },
  {
    id: "poplar-dlr",
    name: "Poplar",
    kind: "Multi-branch",
    mode: "dlr",
    lineIds: ["dlr"],
    stationLabel: "Poplar",
    radiusM: 800,
    hops: 1,
    notes:
      "DLR corridors fan at Poplar. Geographic dual tracks and the schematic should agree on which legs actually continue through.",
  },
]
