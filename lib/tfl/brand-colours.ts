/**
 * TfL brand colour tokens from Colour standard (Issue 10) and Line diagram
 * standard (Issue 4). Pantone / CMYK / RGB / NCS are as published — do not
 * invent CMYK from hex. Prefer licensed artwork for print.
 *
 * Upstream: https://tfl.gov.uk/info-for/business-and-advertisers/design-standards
 * (Colour standard + Line diagram standard PDFs and related brand files).
 * Mono / B&W line patterns: https://content.tfl.gov.uk/bw-large-print-tube-map.pdf
 * via https://tfl.gov.uk/maps/track/tube
 */

/** Corporate / bar blue (PMS 072) — R0 G25 B168. */
export const TFL_BLUE = "#0019A8";

/** Classic Underground roundel ring red (not the Underground modal strip). */
export const UNDERGROUND_RING_RED = "#E1251F";

/** Published colour systems for one TfL brand colour. */
export type BrandColourSpec = {
  label: string;
  pantone: string;
  /** e.g. `C100 M97 Y3 K3`, or `N/A`. */
  cmyk: string;
  /** Space-separated sRGB 0–255 channels, e.g. `0 25 168`. */
  rgb: string;
  hex: string;
  /** Natural Colour System reference, or `N/A`. */
  ncs: string;
  stripText?: "white" | typeof TFL_BLUE;
};

const rgbToHex = (rgb: string): string => {
  const [r, g, b] = rgb.split(/\s+/).map(Number);
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
};

const colour = (
  label: string,
  pantone: string,
  cmyk: string,
  rgb: string,
  ncs: string,
  stripText: BrandColourSpec["stripText"] = "white",
): BrandColourSpec => ({
  label,
  pantone,
  cmyk,
  rgb,
  hex: rgbToHex(rgb),
  ncs,
  stripText,
});

export const TFL_MODAL_COLOURS = {
  tfl: colour(
    "Transport for London",
    "PMS 072",
    "C100 M97 Y3 K3",
    "0 25 168",
    "NCS S 4060-R80B",
  ),
  dlr: colour("DLR", "PMS 326", "C86 M2 Y41 K0", "0 175 173", "NCS S 2050-B50G"),
  elizabeth: colour(
    "Elizabeth line",
    "PMS 266",
    "C67 M83 Y0 K0",
    "96 57 158",
    "N/A",
  ),
  buses: colour(
    "London Buses",
    "PMS 485",
    "C6 M98 Y100 K1",
    "220 36 31",
    "NCS S 1085-Y80R",
  ),
  /** Mode / roundel identity (purple). Map diagrams use triple red rails. */
  cableCar: colour(
    "London Cable Car",
    "PMS N/A",
    "C65 M81 Y0 K0",
    "115 79 160",
    "N/A",
  ),
  coaches: colour(
    "London Coaches",
    "PMS 130",
    "C2 M38 Y100 K0",
    "255 166 0",
    "NCS S 1070-Y20R",
    TFL_BLUE,
  ),
  dialARide: colour(
    "London Dial-a-Ride",
    "PMS Pantone Purple",
    "C35 M88 Y0 K0",
    "192 40 185",
    "NCS S 2060-R40B",
  ),
  overground: colour(
    "London Overground",
    "PMS 158",
    "C3 M66 Y99 K0",
    "250 123 5",
    "NCS S 0585-Y50R",
  ),
  river: colour(
    "London River Services",
    "PMS 299",
    "C81 M18 Y0 K0",
    "3 155 229",
    "NCS S 2060-B",
  ),
  trams: colour(
    "London Trams",
    "PMS 368",
    "C59 M2 Y100 K0",
    "95 181 38",
    "NCS S 0580-G30Y",
  ),
  underground: colour(
    "London Underground",
    "PMS 072",
    "C100 M97 Y3 K3",
    "0 25 168",
    "NCS S 4060-R80B",
  ),
  cycles: colour(
    "Santander Cycles",
    "PMS N/A",
    "C0 M93 Y100 K0",
    "239 56 36",
    "N/A",
  ),
} as const satisfies Record<string, BrandColourSpec>;

export type ModalColourKey = keyof typeof TFL_MODAL_COLOURS;

/** Underground line colours — Issue 4 §3 / Colour standard §5. */
export const UNDERGROUND_LINE_COLOURS = {
  bakerloo: colour(
    "Bakerloo",
    "PMS 470",
    "C26 M70 Y97 K16",
    "178 99 0",
    "NCS S 4050-Y50R",
  ),
  central: colour(
    "Central",
    "PMS 485",
    "C6 M98 Y100 K1",
    "220 36 31",
    "NCS S 1085-Y80R",
  ),
  circle: colour(
    "Circle",
    "PMS 116",
    "C0 M18 Y100 K0",
    "255 200 10",
    "NCS S 0580-Y10R",
  ),
  district: colour(
    "District",
    "PMS 356",
    "C96 M27 Y100 K15",
    "0 125 50",
    "NCS S 3065-G10Y",
  ),
  hammersmithCity: colour(
    "Hammersmith & City",
    "PMS 197",
    "C3 M48 Y15 K0",
    "245 137 166",
    "NCS S 0550-R10B",
  ),
  jubilee: colour(
    "Jubilee",
    "PMS 430",
    "C55 M41 Y38 K5",
    "131 141 147",
    "NCS S 4005-R80B",
  ),
  metropolitan: colour(
    "Metropolitan",
    "PMS 235",
    "C41 M100 Y41 K21",
    "155 0 88",
    "NCS S 4050-R30B",
  ),
  northern: colour(
    "Northern",
    "PMS Black",
    "C0 M0 Y0 K100",
    "0 0 0",
    "NCS S 9000-N",
  ),
  piccadilly: colour(
    "Piccadilly",
    "PMS 072",
    "C100 M97 Y3 K3",
    "0 25 168",
    "NCS S 4060-R80B",
  ),
  victoria: colour(
    "Victoria",
    "PMS 299",
    "C81 M18 Y0 K0",
    "3 155 229",
    "NCS S 2060-B",
  ),
  waterlooCity: colour(
    "Waterloo & City",
    "PMS 338",
    "C55 M0 Y39 K0",
    "118 208 189",
    "NCS S 1040-B80G",
  ),
} as const satisfies Record<string, BrandColourSpec>;

export type UndergroundLineColourKey = keyof typeof UNDERGROUND_LINE_COLOURS;

/** London Overground line colours — Issue 4 §4 / Colour standard §6. */
export const OVERGROUND_LINE_COLOURS = {
  liberty: colour(
    "Liberty",
    "PMS 6215",
    "C50 M40 Y40 K40",
    "93 96 97",
    "NCS S 6502-B",
  ),
  lioness: colour(
    "Lioness",
    "PMS 2012",
    "C0 M40 Y100 K0",
    "250 166 26",
    "NCS S 1080-Y20R",
  ),
  mildmay: colour(
    "Mildmay",
    "PMS 2383",
    "C85 M40 Y5 K10",
    "0 119 173",
    "NCS S 3050-R90B",
  ),
  suffragette: colour(
    "Suffragette",
    "PMS 6171",
    "C65 M0 Y75 K0",
    "91 189 114",
    "NCS S 2050-G20Y",
  ),
  weaver: colour(
    "Weaver",
    "PMS 689",
    "C30 M80 Y20 K35",
    "130 58 98",
    "NCS S 4040-R30B",
  ),
  windrush: colour(
    "Windrush",
    "PMS 1795",
    "C0 M100 Y90 K0",
    "237 27 0",
    "NCS S 1080-Y90R",
  ),
} as const satisfies Record<string, BrandColourSpec>;

export type OvergroundLineColourKey = keyof typeof OVERGROUND_LINE_COLOURS;

/**
 * Map / diagram cable-car paint: Central red as three rails with white gaps.
 * Mode/roundel identity remains {@link TFL_MODAL_COLOURS.cableCar} purple.
 */
export const CABLE_CAR_MAP_COLOUR = UNDERGROUND_LINE_COLOURS.central;
