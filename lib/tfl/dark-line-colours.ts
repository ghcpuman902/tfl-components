/**
 * Dark-map line colours derived from TfL Go day→night research.
 *
 * Default dark palette = Issue-4 brand OKLCH + capture-resistant median
 * day→night delta (raise L, slight C, hold hue). Northern is the Go-style
 * light fill (`#FCFCFC`), not brand black.
 *
 * Opt-in halo: keep brand-black Northern with a light stroke / text-shadow
 * via `data-tfl-northern="halo"` (see generated `tfl-colours.css`).
 */

import type { BrandColourSpec } from "@/lib/tfl/brand-colours";
import {
  parseHex,
  parseRgbChannels,
  srgbToOklchCss,
  type Srgb,
} from "@/lib/tfl/colour-formats";

/** Go night map paper (charcoal — not pitch black). */
export const GO_NIGHT_PAPER = "#2C2C32";

/**
 * Median day→night OKLCH delta from TfL Go map colour research.
 * Prefer this over raw night hex samples (capture-resistant).
 */
export const GO_NIGHT_OKLCH_DELTA = {
  dL: 0.03325,
  dC: 0.00838,
  dH: 0.776,
} as const;

/** TfL Go Northern light fill on dark maps. */
export const NORTHERN_DARK_HEX = "#FCFCFC";

export type Oklch = { L: number; C: number; H: number };

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const srgbChannelToLinear = (c: number): number => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const linearToSrgbChannel = (c: number): number => {
  const s =
    c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(clamp01(s) * 255);
};

const linearSrgbToOklab = (r: number, g: number, b: number) => {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
};

export const srgbToOklch = (srgb: Srgb): Oklch => {
  const lab = linearSrgbToOklab(
    srgbChannelToLinear(srgb.r),
    srgbChannelToLinear(srgb.g),
    srgbChannelToLinear(srgb.b),
  );
  const C = Math.hypot(lab.a, lab.b);
  let H = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L: lab.L, C, H };
};

export const hexToOklch = (hex: string): Oklch => srgbToOklch(parseHex(hex));

export const oklchToSrgb = ({ L, C, H }: Oklch): Srgb => {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const mm = m_ ** 3;
  const s = s_ ** 3;
  return {
    r: linearToSrgbChannel(
      +4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    ),
    g: linearToSrgbChannel(
      -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    ),
    b: linearToSrgbChannel(
      -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
    ),
  };
};

export const oklchToHex = (oklch: Oklch): string => {
  const { r, g, b } = oklchToSrgb(oklch);
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
};

export type NightOklchDelta = {
  dL: number;
  dC: number;
  dH: number;
};

/** Remap a baked GeoJSON line hex for the current basemap. */
export const mapLineColorForBasemap = (hex: string, dark: boolean): string => {
  if (!dark) return hex;
  const n = hex.replace("#", "").toUpperCase();
  if (n === "000000" || n === "000") return NORTHERN_DARK_HEX;
  return applyBrandNightMethod(hex);
};

/** Apply OKLCH night delta to a brand hex (or any sRGB hex). */
export const applyBrandNightMethod = (
  brandHex: string,
  delta: NightOklchDelta = GO_NIGHT_OKLCH_DELTA,
): string => {
  const o = hexToOklch(brandHex);
  let H = o.H + delta.dH;
  if (H < 0) H += 360;
  if (H >= 360) H -= 360;
  return oklchToHex({
    L: Math.min(1, Math.max(0, o.L + delta.dL)),
    C: Math.max(0, o.C + delta.dC),
    H,
  });
};

/** Dark-map OKLCH CSS for a published brand colour (Northern excluded). */
export const darkOklchFromBrandSpec = (spec: BrandColourSpec): string => {
  const nightHex = applyBrandNightMethod(spec.hex);
  return srgbToOklchCss(parseHex(nightHex));
};

export const northernDarkOklch = (): string =>
  srgbToOklchCss(parseHex(NORTHERN_DARK_HEX));

/** Brand RGB → dark OKLCH via night method (for token build). */
export const darkOklchFromRgbChannels = (rgb: string): string => {
  const srgb = parseRgbChannels(rgb);
  const h = (n: number) => n.toString(16).padStart(2, "0");
  const hex = `#${h(srgb.r)}${h(srgb.g)}${h(srgb.b)}`;
  return srgbToOklchCss(parseHex(applyBrandNightMethod(hex)));
};
