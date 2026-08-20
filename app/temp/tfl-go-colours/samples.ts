/**
 * Curated TfL brand vs TfL Go day/night map samples.
 *
 * Go hexes are screenshot cores (mode / HSV isolate) — approximate under
 * AirDrop + display capture. Prefer relative day→night deltas over absolute hex.
 */

import {
  TFL_MODAL_COLOURS,
  UNDERGROUND_LINE_COLOURS,
} from "@/lib/tfl/brand-colours"

export const GO_DAY_PAPER = "#FFFFFF"
/** Dominant night map paper from Go screenshot (not pitch black). */
export const GO_NIGHT_PAPER = "#2C2C32"

export type GoColourRow = {
  id: string
  label: string
  brand: string
  /** Go day core sample (or null if not observed). */
  goDay: string | null
  /** Go night core sample (or null). */
  goNight: string | null
  notes?: string
  /** Brand hex is a stand-in — skip brand→Go contrast claims. */
  brandPlaceholder?: boolean
}

const brand = (hex: string) => hex.toUpperCase()

export const GO_COLOUR_ROWS: GoColourRow[] = [
  {
    id: "bakerloo",
    label: "Bakerloo",
    brand: brand(UNDERGROUND_LINE_COLOURS.bakerloo.hex),
    goDay: "#A86828",
    goNight: "#80603C",
  },
  {
    id: "central",
    label: "Central",
    brand: brand(UNDERGROUND_LINE_COLOURS.central.hex),
    goDay: "#C4382C",
    goNight: "#D83C30",
  },
  {
    id: "circle",
    label: "Circle",
    brand: brand(UNDERGROUND_LINE_COLOURS.circle.hex),
    goDay: "#F4C848",
    goNight: "#FCD84C",
  },
  {
    id: "district",
    label: "District",
    brand: brand(UNDERGROUND_LINE_COLOURS.district.hex),
    goDay: "#387C3C",
    goNight: "#489850",
  },
  {
    id: "hammersmithCity",
    label: "Hammersmith & City",
    brand: brand(UNDERGROUND_LINE_COLOURS.hammersmithCity.hex),
    goDay: "#E48CA4",
    goNight: "#F490AC",
  },
  {
    id: "jubilee",
    label: "Jubilee",
    brand: brand(UNDERGROUND_LINE_COLOURS.jubilee.hex),
    goDay: "#8B8C92",
    goNight: "#707074",
  },
  {
    id: "metropolitan",
    label: "Metropolitan",
    brand: brand(UNDERGROUND_LINE_COLOURS.metropolitan.hex),
    goDay: "#8C1C58",
    goNight: "#A42864",
  },
  {
    id: "northern",
    label: "Northern",
    brand: brand(UNDERGROUND_LINE_COLOURS.northern.hex),
    goDay: "#000000",
    goNight: "#000000",
    notes: "Night needs white outline (#FCFCFC); fill alone fails on charcoal.",
  },
  {
    id: "northernOutline",
    label: "Northern outline",
    brand: "#FFFFFF",
    goDay: null,
    goNight: "#FCFCFC",
    brandPlaceholder: true,
    notes: "Go night light treatment (not a brand line colour).",
  },
  {
    id: "piccadilly",
    label: "Piccadilly",
    brand: brand(UNDERGROUND_LINE_COLOURS.piccadilly.hex),
    goDay: "#081CA0",
    goNight: "#2A437C",
    notes: "Night lifts mid-navy — brand blue is too dark on charcoal.",
  },
  {
    id: "victoria",
    label: "Victoria",
    brand: brand(UNDERGROUND_LINE_COLOURS.victoria.hex),
    goDay: "#4490D4",
    goNight: "#54ACFC",
  },
  {
    id: "waterlooCity",
    label: "Waterloo & City",
    brand: brand(UNDERGROUND_LINE_COLOURS.waterlooCity.hex),
    goDay: "#7CB8B8",
    goNight: "#ACECDC",
  },
  {
    id: "dlr",
    label: "DLR",
    brand: brand(TFL_MODAL_COLOURS.dlr.hex),
    goDay: "#6AA8A9",
    goNight: "#5CA4A8",
  },
  {
    id: "elizabeth",
    label: "Elizabeth",
    brand: brand(TFL_MODAL_COLOURS.elizabeth.hex),
    goDay: "#68558F",
    goNight: "#61468F",
  },
  {
    id: "overground",
    label: "Overground",
    brand: brand(TFL_MODAL_COLOURS.overground.hex),
    goDay: "#F0A83C",
    goNight: "#C8782C",
  },
  {
    id: "trams",
    label: "Trams",
    brand: brand(TFL_MODAL_COLOURS.trams.hex),
    goDay: "#70A83C",
    goNight: "#78A458",
  },
  {
    id: "nationalRail",
    label: "National Rail",
    brand: "#BEBEBE",
    goDay: "#D8A0AE",
    goNight: "#946070",
    brandPlaceholder: true,
    notes:
      "No Issue-4 NR pink in brand-colours; brand placeholder is neutral grey.",
  },
]
