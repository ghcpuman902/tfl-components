const channel = (value: number): number => {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

const luminance = (hex: string): number | null => {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return null
  const n = Number.parseInt(match[1], 16)
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  )
}

/**
 * Text colour for a line chip. White wherever it reaches the 3:1 large-text
 * contrast (share-card chips are 24px+), else ink. Unknown colours get ink.
 */
export const ogChipTextColor = (
  hex: string,
  ink = "#171717",
  paper = "#FFFFFF"
): string => {
  const l = luminance(hex)
  if (l == null) return ink
  return 1.05 / (l + 0.05) >= 3 ? paper : ink
}
