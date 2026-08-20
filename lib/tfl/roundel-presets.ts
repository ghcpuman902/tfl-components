import {
  TFL_BLUE,
  TFL_MODAL_COLOURS,
  UNDERGROUND_RING_RED,
} from "@/lib/tfl/brand-colours"

/** Wikimedia Commons sources for the common mode roundels. */
export const ROUNDEL_LOGO_SOURCES = {
  underground: "https://commons.wikimedia.org/wiki/File:Underground.svg",
  elizabeth:
    "https://commons.wikimedia.org/wiki/File:Elizabeth_line_roundel.svg",
  overground: "https://commons.wikimedia.org/wiki/File:Overground_roundel.svg",
  dlr: "https://commons.wikimedia.org/wiki/File:DLR_roundel.svg",
  tram: "https://commons.wikimedia.org/wiki/File:Tramlink_roundel.svg",
  buses: "https://commons.wikimedia.org/wiki/File:London_Buses_roundel.svg",
  nationalRail:
    "https://upload.wikimedia.org/wikipedia/sco/3/31/National_Rail_logo.svg",
} as const

/** Local copies under `/public/transit-logos` (same files as the Commons versions). */
export const ROUNDEL_LOGO_PATHS = {
  underground: "/transit-logos/underground.svg",
  elizabeth: "/transit-logos/elizabeth-line-roundel.svg",
  overground: "/transit-logos/overground-roundel.svg",
  dlr: "/transit-logos/dlr-roundel.svg",
  tram: "/transit-logos/tram-roundel.svg",
  nationalRail: "/transit-logos/national-rail.svg",
} as const

export type RoundelStyle = "standard" | "outline" | "cycles"

type RoundelPresetDef = {
  ringColor: string
  barColor: string
  textColor: string
  text: string
  label: string
  /** Visual variant from Basic Elements §3. */
  style: RoundelStyle
  /**
   * Stroke around the bar. TfL Basic Elements: **Cycles only**
   * (white bar with green border). Omit for every other mode.
   */
  barBorderColor?: string
  logoPath?: string
  logoSource?: string
}

/**
 * Mode roundels from TfL Basic Elements §3.
 * Colours align with modal palette; Underground ring stays classic red.
 */
export const ROUNDEL_PRESETS = {
  tfl: {
    ringColor: TFL_BLUE,
    barColor: TFL_BLUE,
    textColor: "#FFFFFF",
    text: "",
    label: "Transport for London",
    style: "standard",
  },
  underground: {
    ringColor: UNDERGROUND_RING_RED,
    barColor: TFL_BLUE,
    textColor: "#FFFFFF",
    text: "UNDERGROUND",
    label: "London Underground",
    style: "standard",
    logoPath: ROUNDEL_LOGO_PATHS.underground,
    logoSource: ROUNDEL_LOGO_SOURCES.underground,
  },
  dlr: {
    ringColor: TFL_MODAL_COLOURS.dlr.hex,
    barColor: TFL_BLUE,
    textColor: "#FFFFFF",
    text: "DLR",
    label: "Docklands Light Railway",
    style: "standard",
    logoPath: ROUNDEL_LOGO_PATHS.dlr,
    logoSource: ROUNDEL_LOGO_SOURCES.dlr,
  },
  elizabeth: {
    ringColor: TFL_MODAL_COLOURS.elizabeth.hex,
    barColor: TFL_BLUE,
    textColor: "#FFFFFF",
    text: "ELIZABETH LINE",
    label: "Elizabeth line",
    style: "standard",
    logoPath: ROUNDEL_LOGO_PATHS.elizabeth,
    logoSource: ROUNDEL_LOGO_SOURCES.elizabeth,
  },
  buses: {
    ringColor: TFL_MODAL_COLOURS.buses.hex,
    /** Buses is monochrome red (ring + bar); not the Underground blue bar. */
    barColor: TFL_MODAL_COLOURS.buses.hex,
    textColor: "#FFFFFF",
    text: "BUSES",
    label: "London Buses",
    style: "standard",
    logoSource: ROUNDEL_LOGO_SOURCES.buses,
  },
  cableCar: {
    ringColor: TFL_MODAL_COLOURS.cableCar.hex,
    barColor: TFL_MODAL_COLOURS.cableCar.hex,
    textColor: TFL_MODAL_COLOURS.cableCar.hex,
    text: "CABLE CAR",
    label: "London Cable Car",
    style: "outline",
  },
  coaches: {
    ringColor: TFL_MODAL_COLOURS.coaches.hex,
    barColor: TFL_BLUE,
    textColor: "#FFFFFF",
    text: "COACHES",
    label: "London Coaches",
    style: "standard",
  },
  dialARide: {
    ringColor: TFL_MODAL_COLOURS.dialARide.hex,
    barColor: TFL_BLUE,
    textColor: "#FFFFFF",
    text: "DIAL-A-RIDE",
    label: "London Dial-a-Ride",
    style: "standard",
  },
  overground: {
    ringColor: TFL_MODAL_COLOURS.overground.hex,
    barColor: TFL_BLUE,
    textColor: "#FFFFFF",
    text: "OVERGROUND",
    label: "London Overground",
    style: "standard",
    logoPath: ROUNDEL_LOGO_PATHS.overground,
    logoSource: ROUNDEL_LOGO_SOURCES.overground,
  },
  river: {
    ringColor: TFL_MODAL_COLOURS.river.hex,
    barColor: TFL_BLUE,
    textColor: "#FFFFFF",
    text: "RIVER",
    label: "London River Services",
    style: "standard",
  },
  tram: {
    ringColor: TFL_MODAL_COLOURS.trams.hex,
    barColor: TFL_BLUE,
    textColor: "#FFFFFF",
    text: "TRAMS",
    label: "London Trams",
    style: "standard",
    logoPath: ROUNDEL_LOGO_PATHS.tram,
    logoSource: ROUNDEL_LOGO_SOURCES.tram,
  },
  cycles: {
    ringColor: TFL_MODAL_COLOURS.cycles.hex,
    barColor: "#FFFFFF",
    textColor: TFL_MODAL_COLOURS.cycles.hex,
    text: "CYCLES",
    label: "Santander Cycles",
    style: "cycles",
    /** Basic Elements: Cycles bar is white with a green border. */
    barBorderColor: TFL_MODAL_COLOURS.cycles.hex,
  },
} as const satisfies Record<string, RoundelPresetDef>

export type RoundelPreset = keyof typeof ROUNDEL_PRESETS

export const getRoundelLogoPath = (
  variant: RoundelPreset
): string | undefined => {
  const preset = ROUNDEL_PRESETS[variant]
  return "logoPath" in preset ? preset.logoPath : undefined
}

/** Official TfL brand / IP pages for third-party use. */
export const TFL_BRAND_LINKS = {
  usingBrandIp:
    "https://tfl.gov.uk/info-for/business-and-advertisers/using-tfl-brand-ip",
  logoRequests:
    "https://tfl.gov.uk/info-for/suppliers-and-contractors/logo-requests",
  designStandards:
    "https://tfl.gov.uk/info-for/suppliers-and-contractors/design-standards",
  fontRequests:
    "https://tfl.gov.uk/info-for/business-and-advertisers/font-requests?intcmp=5840",
  ipGuidancePdf: "https://content.tfl.gov.uk/tfl-ip-guidance.pdf",
  basicElementsPdf:
    "https://content.tfl.gov.uk/tfl-basic-elements-standards-issue-08.pdf",
  hammersmithOne:
    "https://fonts.google.com/specimen/Hammersmith+One?preview.script=Latn",
  p22UndergroundAdobe: "https://fonts.adobe.com/fonts/p22-underground",
} as const
