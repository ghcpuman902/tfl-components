/**
 * Format helpers for TfL brand colours.
 *
 * Published Pantone / CMYK / NCS stay as authored in `brand-colours`.
 * Screen extras (OKLCH, Display P3) are derived by treating the published RGB
 * as **sRGB** (Colour standard §1 — RGB for displays), then converting with
 * Björn Ottosson’s OKLab and the CSS Color 4 sRGB↔Display-P3 matrices.
 * Dark-map OKLCH/hex use the Go night method in `dark-line-colours`.
 */

import type { BrandColourSpec } from "@/lib/tfl/brand-colours";
import {
  applyBrandNightMethod,
  NORTHERN_DARK_HEX,
} from "@/lib/tfl/dark-line-colours";

export type Srgb = { r: number; g: number; b: number };

export type ColourFormatRow = {
  label: string;
  value: string;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export const parseRgbChannels = (rgb: string): Srgb => {
  const [r, g, b] = rgb.split(/\s+/).map(Number);
  return { r, g, b };
};

export const parseHex = (hex: string): Srgb => {
  const h = hex.replace("#", "");
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  };
};

const srgbChannelToLinear = (c: number): number => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const linearToSrgbChannel = (c: number): number => {
  const s =
    c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(clamp01(s) * 255);
};

/** Linear sRGB → OKLab (Ottosson). */
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

/** OKLab → OKLCH. */
const oklabToOklch = ({ L, a, b }: { L: number; a: number; b: number }) => {
  const C = Math.hypot(a, b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C, H };
};

/** Linear sRGB → CIE XYZ (D65). */
const linearSrgbToXyz = (r: number, g: number, b: number) => ({
  x: 0.4123907993 * r + 0.3575843394 * g + 0.1804807884 * b,
  y: 0.2126390059 * r + 0.7151686788 * g + 0.0721923154 * b,
  z: 0.0193308187 * r + 0.1191947798 * g + 0.9505321522 * b,
});

/** CIE XYZ (D65) → linear Display P3. */
const xyzToLinearP3 = (x: number, y: number, z: number) => ({
  r: 2.4934969119 * x - 0.9313836179 * y - 0.4027107845 * z,
  g: -0.8294868756 * x + 1.7626998057 * y + 0.0236256856 * z,
  b: 0.0358458302 * x - 0.0761723893 * y + 0.956884524 * z,
});

const linearToP3Channel = (c: number): number => {
  const v = clamp01(c);
  return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
};

const fmt = (n: number, digits: number) => {
  const s = n.toFixed(digits);
  return s.replace(/\.?0+$/, "") || "0";
};

/** Absolute OKLCH CSS from sRGB 0–255 (TfL published RGB as sRGB). */
export const srgbToOklchCss = (srgb: Srgb): string => {
  const r = srgbChannelToLinear(srgb.r);
  const g = srgbChannelToLinear(srgb.g);
  const b = srgbChannelToLinear(srgb.b);
  const { L, C, H } = oklabToOklch(linearSrgbToOklab(r, g, b));
  if (C < 0.0001) return `oklch(${fmt(L * 100, 3)}% 0 0)`;
  return `oklch(${fmt(L * 100, 3)}% ${fmt(C, 4)} ${fmt(H, 2)})`;
};

/**
 * Display-P3 CSS `color()` encoding of the same stimulus as sRGB.
 * Same chromaticity — not a boosted “vivid” remapping.
 */
export const srgbToDisplayP3Css = (srgb: Srgb): string => {
  const lr = srgbChannelToLinear(srgb.r);
  const lg = srgbChannelToLinear(srgb.g);
  const lb = srgbChannelToLinear(srgb.b);
  const xyz = linearSrgbToXyz(lr, lg, lb);
  const p3 = xyzToLinearP3(xyz.x, xyz.y, xyz.z);
  return `color(display-p3 ${fmt(linearToP3Channel(p3.r), 4)} ${fmt(linearToP3Channel(p3.g), 4)} ${fmt(linearToP3Channel(p3.b), 4)})`;
};

export const formatRgbCss = (srgb: Srgb): string =>
  `rgb(${srgb.r} ${srgb.g} ${srgb.b})`;

export const formatHex = (srgb: Srgb): string => {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(srgb.r)}${h(srgb.g)}${h(srgb.b)}`.toUpperCase();
};

/** Round-trip check helper (tests / tooling). */
export const oklchCssToSrgbApprox = (oklch: string): Srgb | null => {
  const m = oklch.match(
    /oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/i,
  );
  if (!m) return null;
  const L = Number(m[1]) / 100;
  const C = Number(m[2]);
  const H = (Number(m[3]) * Math.PI) / 180;
  const a = C * Math.cos(H);
  const b = C * Math.sin(H);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const mm = m_ ** 3;
  const s = s_ ** 3;
  const r =
    +4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s;
  const g =
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s;
  const bl =
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s;
  return {
    r: linearToSrgbChannel(r),
    g: linearToSrgbChannel(g),
    b: linearToSrgbChannel(bl),
  };
};

/**
 * Copyable format rows for a published brand colour.
 * Order: light OKLCH/hex → dark OKLCH/hex → print tokens from the PDF.
 */
export const brandColourFormats = (
  spec: BrandColourSpec,
  opts?: { lineId?: string },
): ColourFormatRow[] => {
  const row = brandColourTableRow(spec, opts);
  return [
    ...row.screen.map((col) => ({ label: col.label, value: col.value })),
    { label: "CMYK", value: spec.cmyk },
    { label: "Pantone", value: spec.pantone },
    {
      label: "NCS",
      value: spec.ncs === "N/A" ? "none available" : spec.ncs,
    },
  ];
};

/** Parse Colour-standard CMYK (`C6 M98 Y100 K1`) → 0–1 channels. */
export const parseCmyk = (
  cmyk: string,
): { c: number; m: number; y: number; k: number } | null => {
  const m = cmyk.match(
    /C\s*([\d.]+)\s*M\s*([\d.]+)\s*Y\s*([\d.]+)\s*K\s*([\d.]+)/i,
  );
  if (!m) return null;
  return {
    c: Number(m[1]) / 100,
    m: Number(m[2]) / 100,
    y: Number(m[3]) / 100,
    k: Number(m[4]) / 100,
  };
};

/**
 * CSS Color 4 `device-cmyk()` for screen emulation of the published print build.
 * Unsupported browsers ignore it; UI always supplies an sRGB fallback.
 */
export const cmykToDeviceCmykCss = (cmyk: string): string | null => {
  const ch = parseCmyk(cmyk);
  if (!ch) return null;
  const f = (n: number) => fmt(n, 4);
  return `device-cmyk(${f(ch.c)} ${f(ch.m)} ${f(ch.y)} ${f(ch.k)})`;
};

export type ColourTableScreenCol = {
  key: "oklch-light" | "hex-light" | "oklch-dark" | "hex-dark";
  label: string;
  /** Exact CSS color for the cell’s underside swatch. */
  cssColor: string;
  /** Copied / shown value. */
  value: string;
  /** Dark columns sit on charcoal paper so light fills stay visible. */
  nightPaper?: boolean;
};

export type ColourTablePrintCell = {
  /** Joined printable tokens for copy. */
  value: string;
  lines: string[];
  /** `device-cmyk(...)` when CMYK is published; else sRGB hex. */
  cssColor: string;
  /** sRGB fallback when device-cmyk is unsupported. */
  cssFallback: string;
};

export type ColourTableRow = {
  hex: string;
  darkHex: string;
  screen: ColourTableScreenCol[];
  print: ColourTablePrintCell;
};

/** Column model for the formats table (light + dark OKLCH/hex, then print). */
export const brandColourTableRow = (
  spec: BrandColourSpec,
  opts?: { lineId?: string },
): ColourTableRow => {
  const srgb = parseRgbChannels(spec.rgb);
  const hex = spec.hex.startsWith("#") ? spec.hex : formatHex(srgb);
  const oklch = srgbToOklchCss(srgb);
  const darkHex =
    opts?.lineId === "northern"
      ? NORTHERN_DARK_HEX
      : applyBrandNightMethod(hex);
  const darkOklch = srgbToOklchCss(parseHex(darkHex));
  const deviceCmyk = cmykToDeviceCmykCss(spec.cmyk);
  const printLines = [
    spec.cmyk !== "N/A" ? spec.cmyk : "CMYK N/A",
    spec.pantone !== "N/A" ? spec.pantone : "Pantone N/A",
    spec.ncs !== "N/A" ? spec.ncs : "NCS none available",
  ];

  return {
    hex,
    darkHex,
    screen: [
      { key: "oklch-light", label: "OKLCH", cssColor: oklch, value: oklch },
      { key: "hex-light", label: "HEX", cssColor: hex, value: hex },
      {
        key: "oklch-dark",
        label: "OKLCH dark",
        cssColor: darkOklch,
        value: darkOklch,
        nightPaper: true,
      },
      {
        key: "hex-dark",
        label: "HEX dark",
        cssColor: darkHex,
        value: darkHex,
        nightPaper: true,
      },
    ],
    print: {
      value: printLines.join(" · "),
      lines: printLines,
      cssColor: deviceCmyk ?? hex,
      cssFallback: hex,
    },
  };
};
