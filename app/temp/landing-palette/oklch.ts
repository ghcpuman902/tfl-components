import { parseHex, type Srgb } from "@/lib/tfl/colour-formats"

export type Oklch = { L: number; C: number; H: number }

const srgbChannelToLinear = (c: number): number => {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

const linearSrgbToOklab = (r: number, g: number, b: number) => {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  }
}

export const srgbToOklch = (srgb: Srgb): Oklch => {
  const lab = linearSrgbToOklab(
    srgbChannelToLinear(srgb.r),
    srgbChannelToLinear(srgb.g),
    srgbChannelToLinear(srgb.b),
  )
  const C = Math.hypot(lab.a, lab.b)
  let H = (Math.atan2(lab.b, lab.a) * 180) / Math.PI
  if (H < 0) H += 360
  return { L: lab.L, C, H }
}

export const hexToOklch = (hex: string): Oklch => {
  if (hex.toLowerCase() === "#fff" || hex.toLowerCase() === "#ffffff") {
    return { L: 1, C: 0, H: 0 }
  }
  return srgbToOklch(parseHex(hex))
}

const fmt = (n: number, digits: number) => {
  const s = n.toFixed(digits)
  return s.replace(/\.?0+$/, "") || "0"
}

export const oklchCss = ({ L, C, H }: Oklch): string => {
  if (C < 0.0001) return `oklch(${fmt(L * 100, 1)}% 0 0)`
  return `oklch(${fmt(L * 100, 1)}% ${fmt(C, 3)} ${fmt(H, 1)})`
}

/** Architecture (walls, floor, carpet field): lift L toward cream, drop chroma. */
export const roomLight = (c: Oklch): Oklch => ({
  L: Math.min(0.93, c.L + (0.92 - c.L) * 0.55),
  C: c.C * 0.62,
  H: c.H,
})

/**
 * Sofa / pillow: same lightness as roomLight, halfway from the desaturated
 * wall cream toward a peach-pink (full coral was too strong).
 */
export const sofaLight = (c: Oklch): Oklch => {
  const room = roomLight(c)
  const coralC = Math.min(0.13, c.C * 1.35)
  const coralH = c.H - 16
  return {
    L: room.L,
    C: (room.C + coralC) / 2,
    H: (room.H + coralH) / 2,
  }
}

/** Frames, hearth, pot: modest lift, keep more chroma. */
export const woodLight = (c: Oklch): Oklch => ({
  L: Math.min(0.72, c.L + 0.1),
  C: c.C * 0.88,
  H: c.H,
})
