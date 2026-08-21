import type { ClipId } from "@/lib/temp/placeholder-roundel-spin"

export type HeaderRoundelPhase = ClipId | "rest"

export const nextHeaderRoundelPhase = (
  clip: ClipId,
  hovered: boolean
): HeaderRoundelPhase => {
  if (clip === "intro") return hovered ? "accel" : "rest"
  if (clip === "accel") return hovered ? "loop" : "decel"
  if (clip === "loop") return hovered ? "loop" : "decel"
  return hovered ? "accel" : "rest"
}

export const atlasInnerMarkup = (svg: string): string =>
  svg
    .replace(/<\?xml[^>]*>/g, "")
    .replace(/^[\s\S]*?<svg[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")

export const headerRoundelCell = (
  frameIndex: number,
  columns: number,
  frameWidth: number,
  frameHeight: number
) => {
  const column = frameIndex % columns
  const row = Math.floor(frameIndex / columns)
  return {
    x: column * frameWidth,
    y: row * frameHeight,
    viewBox: `${column * frameWidth} ${row * frameHeight} ${frameWidth} ${frameHeight}`,
  }
}
