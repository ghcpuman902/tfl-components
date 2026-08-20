import {
  hexToOklch,
  oklchCss,
  roomLight,
  sofaLight,
  woodLight,
  type Oklch,
} from "./oklch"

export type LandingScheme = "light" | "dark"
export type TokenRole = "room" | "sofa" | "wood" | "trim" | "fixed"
export type TokenGroup =
  | "room"
  | "trim"
  | "scandi"
  | "wood"
  | "carpet"
  | "painting"
  | "fixed"

export type LandingToken = {
  id: string
  label: string
  role: TokenRole
  group: TokenGroup
  /** Representative source hex (kept after any merge). */
  darkHex: string
  note: string
}

/** Original Illustrator class → hex (cls-24 is stroke-only). */
export const ORIGINAL_CLASS_HEX: Readonly<Record<number, string>> = {
  1: "#59270c",
  2: "#59270c",
  3: "#5a2515",
  4: "#6c4323",
  5: "#762d17",
  6: "#b87534",
  7: "#c48649",
  8: "#ae601f",
  9: "#5f2213",
  10: "#ac6e3c",
  11: "#553417",
  12: "#e9c499",
  13: "#672412",
  14: "#433f1d",
  15: "#d7b18c",
  16: "#a28360",
  17: "#784d23",
  18: "#572012",
  19: "#463015",
  20: "#965c29",
  21: "#4c3418",
  22: "#5f3f22",
  23: "#825e3a",
  24: "#ffffff",
  25: "#6e2314",
  26: "#4f2214",
  27: "#86511e",
  28: "#ae6529",
  29: "#ad855b",
  30: "#5f2c16",
  31: "#be7f4f",
  32: "#c08149",
  33: "#623521",
  34: "#c17f48",
  35: "#85572e",
  36: "#a67544",
  37: "#b18e69",
  38: "#5b3a28",
  39: "#aa7541",
  40: "#764b26",
  41: "#f0e3d5",
  42: "#523518",
  43: "#5e2f1f",
  44: "#5e3326",
  45: "#4a3217",
  46: "#633e28",
  47: "#b6ccbe",
  48: "#906134",
  49: "#512214",
  50: "#562314",
  51: "#5d3a28",
  52: "#80512a",
  53: "#996538",
  54: "#682412",
  55: "#6b2511",
  56: "#ffffff",
  57: "#d6a975",
  58: "#622715",
  59: "#95592f",
  60: "#a95d22",
  61: "#6d2917",
  62: "#89572f",
  63: "#350e05",
  64: "#965421",
  65: "#81542d",
  66: "#3f4121",
  67: "#c4854c",
  68: "#aa7642",
  69: "#e2b987",
  70: "#401e12",
  71: "#84572f",
  72: "#652816",
  73: "#945a29",
  74: "#493217",
  75: "#bf7d46",
  76: "#c17e47",
  77: "#7a2816",
  78: "#ab6e39",
  79: "#90501c",
  80: "#6c4320",
  81: "#e6d2be",
  82: "#493117",
  83: "#6f351e",
  84: "#e8d1b8",
  85: "#5e2514",
  86: "#b48f68",
  87: "#8d5f33",
  88: "#6e2a17",
  89: "#6c2916",
  90: "#92381c",
  91: "#885930",
  92: "#bb7d48",
  93: "#8b6948",
  94: "#5c3e37",
  95: "#684623",
  96: "#582313",
  97: "#976336",
  98: "#692512",
}

/** Large carpet ground — may lift in light mode. Each class keeps its own hex. */
export const CARPET_FIELD_CLASSES = [32, 34, 67, 75, 76, 92] as const

/** Persian-rug pattern — stays dark. Each class keeps its own hex. */
export const CARPET_PATTERN_CLASSES = [
  3, 8, 10, 26, 43, 46, 49, 50, 51, 58, 61, 72, 77, 78, 83, 85, 88, 89, 90, 94,
  96,
] as const

/** Wall painting — unmerged, fixed in both schemes. */
export const PAINTING_CLASSES = [
  4, 5, 11, 13, 19, 20, 21, 30, 42, 45, 52, 54, 55, 62, 64, 69, 71, 73, 74, 79,
  82, 91, 95, 97, 98,
] as const

const hexFor = (cls: number): string => {
  const hex = ORIGINAL_CLASS_HEX[cls]
  if (!hex) throw new Error(`missing original hex for cls-${cls}`)
  return hex
}

const classTokens = (
  classes: readonly number[],
  prefix: "carpet" | "paint",
  role: TokenRole,
  group: TokenGroup,
  note: string,
): LandingToken[] =>
  classes.map((cls) => ({
    id: `${prefix}-${cls}`,
    label: `${ORIGINAL_CLASS_HEX[cls]}`,
    role,
    group,
    darkHex: hexFor(cls),
    note: `${note} (cls-${cls})`,
  }))

const SEMANTIC_TOKENS: readonly LandingToken[] = [
  {
    id: "ceiling",
    label: "Ceiling",
    role: "room",
    group: "room",
    darkHex: "#a28360",
    note: "L3 ceiling slab",
  },
  {
    id: "wall-front",
    label: "Front wall",
    role: "room",
    group: "room",
    darkHex: "#95592f",
    note: "L1 wall mass",
  },
  {
    id: "wall-lower",
    label: "Front wall lower",
    role: "room",
    group: "room",
    darkHex: "#be7f4f",
    note: "L1 band above the foot",
  },
  {
    id: "arch",
    label: "Arch",
    role: "room",
    group: "room",
    darkHex: "#e9c499",
    note: "L1 arch reveal",
  },
  {
    id: "wall-corridor",
    label: "Corridor wall",
    role: "room",
    group: "room",
    darkHex: "#d6a975",
    note: "L2 wall behind the carpet",
  },
  {
    id: "wall-mirror",
    label: "Mirror wall",
    role: "room",
    group: "room",
    darkHex: "#825e3a",
    note: "L3 wall through the mirror hole — split from picture-frame outers via #Wall",
  },
  {
    id: "wall-deco",
    label: "Wall deco",
    role: "room",
    group: "room",
    darkHex: "#8b6948",
    note: "L3 cornice strip",
  },
  {
    id: "floor",
    label: "Floor",
    role: "room",
    group: "room",
    darkHex: "#b87534",
    note: "L3 floor plane",
  },
  {
    id: "sofa",
    label: "Sofa",
    role: "sofa",
    group: "room",
    darkHex: "#906134",
    note: "Sofa body — light mode keeps L, half-way cream-pink chroma",
  },
  {
    id: "sofa-shadow",
    label: "Sofa shadow",
    role: "sofa",
    group: "room",
    darkHex: "#81542d",
    note: "Sofa underside / crease — same light transform as sofa",
  },
  {
    id: "sofa-light",
    label: "Sofa light",
    role: "sofa",
    group: "room",
    darkHex: "#aa7541",
    note: "Sofa highlight planes — same light transform as sofa",
  },
  {
    id: "pillow",
    label: "Pillow",
    role: "sofa",
    group: "room",
    darkHex: "#c48649",
    note: "L0 pillow — same light transform as sofa",
  },
  {
    id: "kicker",
    label: "Kicker",
    role: "trim",
    group: "trim",
    darkHex: "#59270c",
    note: "L3 wall kicker + floor contact shadow (shadow keeps 50% opacity)",
  },
  {
    id: "wall-foot",
    label: "Front wall foot",
    role: "trim",
    group: "trim",
    darkHex: "#6e2314",
    note: "L1 skirting — stays dark in light mode",
  },
  {
    id: "wood-table",
    label: "Table",
    role: "fixed",
    group: "scandi",
    darkHex: "#5f2213",
    note: "Table body and legs — original wood in both schemes",
  },
  {
    id: "wood-drawer",
    label: "Drawer",
    role: "fixed",
    group: "scandi",
    darkHex: "#5e3326",
    note: "Lamp drawer cabinet — original wood in both schemes",
  },
  {
    id: "wood-stem",
    label: "Lamp stem",
    role: "fixed",
    group: "scandi",
    darkHex: "#ae6529",
    note: "Wooden stem of the wall lamp, with the drawer",
  },
  {
    id: "wood-knob",
    label: "Table knobs",
    role: "fixed",
    group: "scandi",
    darkHex: "#a95d22",
    note: "Drawer knobs on #Table only — pot keeps terracotta",
  },
  {
    id: "wood-pot",
    label: "Plant pot",
    role: "wood",
    group: "wood",
    darkHex: "#a95d22",
    note: "Terracotta pot on #Plant",
  },
  {
    id: "wood-frame",
    label: "Wood frame",
    role: "wood",
    group: "wood",
    darkHex: "#86511e",
    note: "Mirror frame, picture-frame outers, painting frame",
  },
  {
    id: "wood-pale",
    label: "Wood pale",
    role: "wood",
    group: "wood",
    darkHex: "#ad855b",
    note: "Picture-frame mats + hearth inner rails",
  },
  {
    id: "hearth",
    label: "Hearth",
    role: "wood",
    group: "wood",
    darkHex: "#6c4320",
    note: "Fireplace surround and bowl",
  },
  {
    id: "void",
    label: "Void",
    role: "fixed",
    group: "fixed",
    darkHex: "#350e05",
    note: "Fireplace hole — stays dark",
  },
  {
    id: "olive",
    label: "Olive",
    role: "fixed",
    group: "fixed",
    darkHex: "#3f4121",
    note: "Plant leaves and cup",
  },
  {
    id: "lamp-metal",
    label: "Lamp metal",
    role: "fixed",
    group: "fixed",
    darkHex: "#623521",
    note: "Hanging-light stem",
  },
  {
    id: "lamp-glass",
    label: "Lamp glass",
    role: "fixed",
    group: "fixed",
    darkHex: "#e8d1b8",
    note: "Globe + wall-lamp shade",
  },
  {
    id: "lamp-glow",
    label: "Lamp glow",
    role: "fixed",
    group: "fixed",
    darkHex: "#f0e3d5",
    note: "Filament highlight",
  },
  {
    id: "ipad-case",
    label: "iPad case",
    role: "fixed",
    group: "fixed",
    darkHex: "#b6ccbe",
    note: "Device shell — no light-mode swap",
  },
  {
    id: "white",
    label: "White",
    role: "fixed",
    group: "fixed",
    darkHex: "#ffffff",
    note: "iPad screen, camera, cable stroke",
  },
]

export const TOKENS: readonly LandingToken[] = [
  ...SEMANTIC_TOKENS,
  ...classTokens(
    CARPET_FIELD_CLASSES,
    "carpet",
    "room",
    "carpet",
    "Carpet field — lifts",
  ),
  ...classTokens(
    CARPET_PATTERN_CLASSES,
    "carpet",
    "fixed",
    "carpet",
    "Carpet pattern — stays dark",
  ),
  ...classTokens(
    PAINTING_CLASSES,
    "paint",
    "fixed",
    "painting",
    "Painting ink — unmerged",
  ),
]

export const TOKEN_BY_ID = Object.fromEntries(
  TOKENS.map((token) => [token.id, token]),
) as Record<string, LandingToken>

const SEMANTIC_CLASS: Readonly<Record<number, string>> = {
  1: "kicker",
  2: "kicker",
  6: "floor",
  7: "pillow",
  9: "wood-table",
  12: "arch",
  14: "olive",
  15: "sofa-light",
  16: "ceiling",
  17: "wood-frame",
  18: "wood-table",
  22: "hearth",
  23: "wood-frame",
  24: "white",
  25: "wall-foot",
  27: "wood-frame",
  28: "wood-stem",
  29: "wood-pale",
  31: "wall-lower",
  33: "lamp-metal",
  35: "sofa-shadow",
  36: "sofa-light",
  37: "wood-pale",
  38: "wood-frame",
  39: "sofa-light",
  40: "wood-frame",
  41: "lamp-glow",
  44: "wood-drawer",
  47: "ipad-case",
  48: "sofa",
  53: "sofa",
  56: "white",
  57: "wall-corridor",
  59: "wall-front",
  60: "wood-pot",
  63: "void",
  65: "sofa-shadow",
  66: "olive",
  68: "sofa-light",
  70: "wood-table",
  80: "hearth",
  81: "lamp-glass",
  84: "lamp-glass",
  86: "wood-pale",
  87: "sofa",
  93: "wall-deco",
}

const classToToken: Record<number, string> = { ...SEMANTIC_CLASS }
for (const cls of CARPET_FIELD_CLASSES) classToToken[cls] = `carpet-${cls}`
for (const cls of CARPET_PATTERN_CLASSES) classToToken[cls] = `carpet-${cls}`
for (const cls of PAINTING_CLASSES) classToToken[cls] = `paint-${cls}`

export const CLASS_TO_TOKEN: Readonly<Record<number, string>> = classToToken

export const ID_TOKEN_OVERRIDES: Readonly<Record<string, string>> = {
  Wall: "wall-mirror",
}

/** Parent-scoped remaps (cls-60 is pot + knobs). */
export const SELECTOR_TOKEN_OVERRIDES: readonly {
  selector: string
  tokenId: string
}[] = [{ selector: "#Table .cls-60", tokenId: "wood-knob" }]

export const STROKE_CLASSES = new Set([24])
export const OPACITY_CLASSES: Readonly<Record<number, number>> = { 1: 0.5 }

export const cssVar = (id: string) => `--landing-${id}`

export const tokenDark = (token: LandingToken): Oklch => hexToOklch(token.darkHex)

export const tokenLight = (token: LandingToken): Oklch => {
  const dark = tokenDark(token)
  if (token.role === "room") return roomLight(dark)
  if (token.role === "sofa") return sofaLight(dark)
  if (token.role === "wood") return woodLight(dark)
  return dark
}

export const tokenCss = (token: LandingToken, scheme: LandingScheme): string =>
  oklchCss(scheme === "light" ? tokenLight(token) : tokenDark(token))

/** Crop / stage paper behind the artwork (matches `/temp/landing-palette`). */
export const LANDING_PAPER: Record<LandingScheme, string> = {
  dark: "oklch(32% 0.03 55)",
  light: "oklch(94% 0.015 75)",
}

/**
 * Resolved fills for the 3D hero SVG. Inline SVG often ignores `var(--*)`
 * on `fill`, so this bakes `oklch()` (and hex-derived) values onto
 * `.landing-cls-*` instead of custom properties.
 *
 * `scope` prefixes every selector (e.g. `.dark`) so both schemes can ship
 * in one sheet and follow the site theme on `<html>`.
 */
export const heroArtworkStyleSheet = (
  scheme: LandingScheme,
  scope = "",
): string => {
  const prefix = scope === "" ? "" : `${scope} `
  const colourOf = (tokenId: string) => tokenCss(TOKEN_BY_ID[tokenId], scheme)
  const rules: string[] = []
  for (const [clsRaw, tokenId] of Object.entries(CLASS_TO_TOKEN)) {
    const cls = Number(clsRaw)
    const selector = `${prefix}.landing-artwork .landing-cls-${cls}`
    const colour = colourOf(tokenId)
    if (STROKE_CLASSES.has(cls)) {
      rules.push(
        `${selector} { fill: none; stroke: ${colour}; stroke-miterlimit: 10; }`,
      )
      continue
    }
    const opacity = OPACITY_CLASSES[cls]
    const extra = opacity != null ? ` opacity: ${opacity};` : ""
    rules.push(`${selector} { fill: ${colour};${extra} }`)
  }
  rules.push(
    `${prefix}.landing-artwork #Wall { fill: ${colourOf("wall-mirror")}; }`,
  )
  rules.push(
    `${prefix}.landing-artwork #Table .landing-cls-60 { fill: ${colourOf("wood-knob")}; }`,
  )
  return rules.join("\n")
}

/** Light fills by default; `.dark` on `<html>` swaps to the dark tokens. */
export const heroArtworkThemeStyleSheet = (): string =>
  [
    heroArtworkStyleSheet("light"),
    heroArtworkStyleSheet("dark", ".dark"),
    `.landing-hero-paper { background: ${LANDING_PAPER.light}; }`,
    `.dark .landing-hero-paper { background: ${LANDING_PAPER.dark}; }`,
    `.landing-hero-wall-fill { background: ${tokenCss(TOKEN_BY_ID["wall-front"], "light")}; }`,
    `.dark .landing-hero-wall-fill { background: ${tokenCss(TOKEN_BY_ID["wall-front"], "dark")}; }`,
    `.landing-hero-floor-fill { background: ${tokenCss(TOKEN_BY_ID["floor"], "light")}; }`,
    `.dark .landing-hero-floor-fill { background: ${tokenCss(TOKEN_BY_ID["floor"], "dark")}; }`,
    `.landing-hero-copy { color: #3f2a1c; }`,
    `.dark .landing-hero-copy { color: ${LANDING_PAPER.light}; }`,
  ].join("\n")

export const getLandingPalette = (
  scheme: LandingScheme,
): Record<string, string> =>
  Object.fromEntries(
    TOKENS.map((token) => [token.id, tokenCss(token, scheme)]),
  )

export const classesForToken = (id: string): number[] =>
  Object.entries(CLASS_TO_TOKEN)
    .filter(([, tokenId]) => tokenId === id)
    .map(([n]) => Number(n))
    .sort((a, b) => a - b)

export const originalHexesForToken = (id: string): string[] => {
  const hexes = new Set<string>()
  for (const cls of classesForToken(id)) {
    const hex = ORIGINAL_CLASS_HEX[cls]
    if (hex) hexes.add(hex.toLowerCase())
  }
  const token = TOKEN_BY_ID[id]
  if (token) hexes.add(token.darkHex.toLowerCase())
  return [...hexes]
}

const schemeVars = (scheme: LandingScheme): string => {
  const lines = TOKENS.map(
    (token) => `    ${cssVar(token.id)}: ${tokenCss(token, scheme)};`,
  )
  return `[data-landing-scheme="${scheme}"] {\n${lines.join("\n")}\n  }`
}

const classRules = (scheme: "original" | LandingScheme): string => {
  const rules: string[] = []
  for (const [clsRaw, tokenId] of Object.entries(CLASS_TO_TOKEN)) {
    const cls = Number(clsRaw)
    const selector = `[data-landing-scheme="${scheme}"] .cls-${cls}`
    if (STROKE_CLASSES.has(cls)) {
      const colour =
        scheme === "original"
          ? ORIGINAL_CLASS_HEX[cls]
          : `var(${cssVar(tokenId)})`
      rules.push(
        `${selector} { fill: none; stroke: ${colour}; stroke-miterlimit: 10; }`,
      )
      continue
    }
    const colour =
      scheme === "original"
        ? ORIGINAL_CLASS_HEX[cls]
        : `var(${cssVar(tokenId)})`
    const opacity = OPACITY_CLASSES[cls]
    const extra = opacity != null ? ` opacity: ${opacity};` : ""
    rules.push(`${selector} { fill: ${colour};${extra} }`)
  }
  if (scheme !== "original") {
    rules.push(
      `[data-landing-scheme="${scheme}"] #Wall { fill: var(${cssVar("wall-mirror")}); }`,
    )
    for (const override of SELECTOR_TOKEN_OVERRIDES) {
      rules.push(
        `[data-landing-scheme="${scheme}"] ${override.selector} { fill: var(${cssVar(override.tokenId)}); }`,
      )
    }
  }
  return rules.join("\n  ")
}

const CLASS_COUNT = 98
for (let i = 1; i <= CLASS_COUNT; i++) {
  if (!(i in CLASS_TO_TOKEN)) throw new Error(`unmapped cls-${i}`)
  if (!(i in ORIGINAL_CLASS_HEX)) throw new Error(`missing original hex for cls-${i}`)
  const tokenId = CLASS_TO_TOKEN[i]
  if (!tokenId || !(tokenId in TOKEN_BY_ID)) {
    throw new Error(`cls-${i} maps to missing token ${tokenId}`)
  }
}

export const paletteStyleSheet = (): string =>
  [
    schemeVars("dark"),
    schemeVars("light"),
    classRules("original"),
    classRules("dark"),
    classRules("light"),
    `[data-landing-scheme] svg { display: block; width: 100%; height: auto; }`,
  ].join("\n\n")
