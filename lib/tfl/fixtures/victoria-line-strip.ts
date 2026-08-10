import type { DiagramSegment, DiagramStation } from "@/lib/tfl/diagram-station";
import { UNDERGROUND_LINE_COLOURS } from "@/lib/tfl/brand-colours";

const U = UNDERGROUND_LINE_COLOURS;

/**
 * Victoria line southbound spine for offline / always-on demos.
 * Key Tube interchange flag blocks; National Rail is a pictogram beside the name.
 */
export const VICTORIA_STRIP: DiagramStation[] = [
  {
    id: "walthamstow",
    name: "Walthamstow Central",
    interchange: true,
    nationalRail: true,
  },
  { id: "blackhorse", name: "Blackhorse Road", interchange: true },
  {
    id: "tottenham",
    name: "Tottenham Hale",
    interchange: true,
    nationalRail: true,
  },
  {
    id: "seven-sisters",
    name: "Seven Sisters",
    interchange: true,
    nationalRail: true,
  },
  {
    id: "finsbury",
    name: "Finsbury Park",
    interchange: true,
    nationalRail: true,
    connections: [
      { id: "piccadilly", name: "Piccadilly", color: U.piccadilly.hex },
    ],
  },
  { id: "highbury", name: "Highbury & Islington", interchange: true },
  {
    id: "kings-cross",
    name: "King's Cross St. Pancras",
    interchange: true,
    nationalRail: true,
    connections: [
      { id: "circle", name: "Circle", color: U.circle.hex, darkText: true },
      {
        id: "hammersmith-city",
        name: "Hammersmith & City",
        color: U.hammersmithCity.hex,
        darkText: true,
      },
      { id: "metropolitan", name: "Metropolitan", color: U.metropolitan.hex },
      { id: "northern", name: "Northern", color: U.northern.hex },
      { id: "piccadilly", name: "Piccadilly", color: U.piccadilly.hex },
    ],
  },
  {
    id: "euston",
    name: "Euston",
    interchange: true,
    nationalRail: true,
    connections: [{ id: "northern", name: "Northern", color: U.northern.hex }],
  },
  {
    id: "warren-street",
    name: "Warren Street",
    interchange: true,
    connections: [{ id: "northern", name: "Northern", color: U.northern.hex }],
  },
  {
    id: "oxford-circus",
    name: "Oxford Circus",
    interchange: true,
    connections: [
      { id: "bakerloo", name: "Bakerloo", color: U.bakerloo.hex },
      { id: "central", name: "Central", color: U.central.hex },
    ],
  },
  {
    id: "green-park",
    name: "Green Park",
    interchange: true,
    connections: [
      { id: "jubilee", name: "Jubilee", color: U.jubilee.hex },
      { id: "piccadilly", name: "Piccadilly", color: U.piccadilly.hex },
    ],
  },
  {
    id: "victoria",
    name: "Victoria",
    interchange: true,
    nationalRail: true,
    connections: [
      { id: "circle", name: "Circle", color: U.circle.hex, darkText: true },
      { id: "district", name: "District", color: U.district.hex },
    ],
  },
  { id: "pimlico", name: "Pimlico" },
  { id: "vauxhall", name: "Vauxhall", interchange: true, nationalRail: true },
  {
    id: "stockwell",
    name: "Stockwell",
    interchange: true,
    connections: [{ id: "northern", name: "Northern", color: U.northern.hex }],
  },
  { id: "brixton", name: "Brixton", interchange: true },
];

/** Sample: no service between Seven Sisters and Green Park — endpoints stay open. */
export const VICTORIA_PART_CLOSURE_SEGMENTS: DiagramSegment[] = (() => {
  const from = "seven-sisters";
  const to = "green-park";
  const fromIndex = VICTORIA_STRIP.findIndex((s) => s.id === from);
  const toIndex = VICTORIA_STRIP.findIndex((s) => s.id === to);
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= toIndex) return [];
  const segments: DiagramSegment[] = [];
  for (let i = fromIndex; i < toIndex; i += 1) {
    segments.push({
      fromStationId: VICTORIA_STRIP[i]!.id,
      toStationId: VICTORIA_STRIP[i + 1]!.id,
      state: "out-of-use",
    });
  }
  return segments;
})();

export const VICTORIA_LINE_COLOR = U.victoria.hex;
