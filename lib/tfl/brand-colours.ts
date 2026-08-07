/**
 * Approximate sRGB hex for TfL colours.
 * Modal / line RGB values from Line diagram standard Issue 4 (Jan 2025).
 * Prefer licensed artwork from TfL for print; these are for UI demos.
 */

/** Corporate / bar blue (PMS 072) — R0 G25 B168. */
export const TFL_BLUE = "#0019A8";

/** Classic Underground roundel ring red (not the Underground modal strip). */
export const UNDERGROUND_RING_RED = "#E1251F";

export const TFL_MODAL_COLOURS = {
  tfl: {
    label: "Transport for London",
    pantone: "PMS 072",
    hex: TFL_BLUE,
    rgb: "0 25 168",
    stripText: "white",
  },
  dlr: {
    label: "DLR",
    pantone: "PMS 326",
    hex: "#00AFAD",
    rgb: "0 175 173",
    stripText: "white",
  },
  elizabeth: {
    label: "Elizabeth line",
    pantone: "PMS 266",
    hex: "#60399E",
    rgb: "96 57 158",
    stripText: "white",
  },
  buses: {
    label: "London Buses",
    pantone: "PMS 485",
    hex: "#DC241F",
    rgb: "220 36 31",
    stripText: "white",
  },
  cableCar: {
    label: "London Cable Car",
    pantone: "N/A",
    hex: "#734FA0",
    rgb: "115 79 160",
    stripText: "white",
  },
  coaches: {
    label: "London Coaches",
    pantone: "PMS 130",
    hex: "#FFA600",
    rgb: "255 166 0",
    stripText: TFL_BLUE,
  },
  dialARide: {
    label: "London Dial-a-Ride",
    pantone: "PMS Pantone Purple",
    hex: "#C028B9",
    rgb: "192 40 185",
    stripText: "white",
  },
  overground: {
    label: "London Overground",
    pantone: "PMS 158",
    hex: "#FA7B05",
    rgb: "250 123 5",
    stripText: "white",
  },
  river: {
    label: "London River Services",
    pantone: "PMS 299",
    hex: "#039BE5",
    rgb: "3 155 229",
    stripText: "white",
  },
  trams: {
    label: "London Trams",
    pantone: "PMS 368",
    hex: "#5FB526",
    rgb: "95 181 38",
    stripText: "white",
  },
  underground: {
    label: "London Underground",
    pantone: "PMS 072",
    hex: TFL_BLUE,
    rgb: "0 25 168",
    stripText: "white",
  },
  cycles: {
    label: "Santander Cycles",
    pantone: "N/A",
    hex: "#EF3824",
    rgb: "239 56 36",
    stripText: "white",
  },
} as const;

export type ModalColourKey = keyof typeof TFL_MODAL_COLOURS;

/** Underground line colours — Issue 4 §3 RGB. */
export const UNDERGROUND_LINE_COLOURS = {
  bakerloo: { label: "Bakerloo", pantone: "PMS 470", hex: "#B26300", rgb: "178 99 0" },
  central: { label: "Central", pantone: "PMS 485", hex: "#DC241F", rgb: "220 36 31" },
  circle: { label: "Circle", pantone: "PMS 116", hex: "#FFC80A", rgb: "255 200 10" },
  district: { label: "District", pantone: "PMS 356", hex: "#007D32", rgb: "0 125 50" },
  hammersmithCity: {
    label: "Hammersmith & City",
    pantone: "PMS 197",
    hex: "#F589A6",
    rgb: "245 137 166",
  },
  jubilee: { label: "Jubilee", pantone: "PMS 430", hex: "#838D93", rgb: "131 141 147" },
  metropolitan: {
    label: "Metropolitan",
    pantone: "PMS 235",
    hex: "#9B0058",
    rgb: "155 0 88",
  },
  northern: { label: "Northern", pantone: "PMS Black", hex: "#000000", rgb: "0 0 0" },
  piccadilly: { label: "Piccadilly", pantone: "PMS 072", hex: TFL_BLUE, rgb: "0 25 168" },
  victoria: { label: "Victoria", pantone: "PMS 299", hex: "#039BE5", rgb: "3 155 229" },
  waterlooCity: {
    label: "Waterloo & City",
    pantone: "PMS 338",
    hex: "#76D0BD",
    rgb: "118 208 189",
  },
} as const;

export type UndergroundLineColourKey = keyof typeof UNDERGROUND_LINE_COLOURS;

/** London Overground line colours — Issue 4 §4 RGB. */
export const OVERGROUND_LINE_COLOURS = {
  liberty: { label: "Liberty", pantone: "PMS 6215", hex: "#5D6061", rgb: "93 96 97" },
  lioness: { label: "Lioness", pantone: "PMS 2012", hex: "#FAA61A", rgb: "250 166 26" },
  mildmay: { label: "Mildmay", pantone: "PMS 2383", hex: "#0077AD", rgb: "0 119 173" },
  suffragette: {
    label: "Suffragette",
    pantone: "PMS 6171",
    hex: "#5BBD72",
    rgb: "91 189 114",
  },
  weaver: { label: "Weaver", pantone: "PMS 689", hex: "#823A62", rgb: "130 58 98" },
  windrush: { label: "Windrush", pantone: "PMS 1795", hex: "#ED1B00", rgb: "237 27 0" },
} as const;

export type OvergroundLineColourKey = keyof typeof OVERGROUND_LINE_COLOURS;
