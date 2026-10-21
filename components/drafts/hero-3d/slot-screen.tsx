"use client"

import { useEffect, useMemo } from "react"
import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three"
import { UNDERGROUND_LINE_COLOURS } from "@/lib/tfl/brand-colours"
import { makeSlotTexture } from "@/components/drafts/hero-3d/textures"

export const SlotScreen = ({
  label,
  width,
  height,
  background,
  foreground,
}: {
  label: string
  width: number
  height: number
  background: string
  foreground: string
}) => {
  const map = useMemo(
    () =>
      makeSlotTexture(
        label,
        Math.round(512 * (width / height > 1 ? width / height : 1)),
        Math.round(512 * (height / width > 1 ? height / width : 1)),
        background,
        foreground
      ),
    [label, width, height, background, foreground]
  )

  useEffect(() => () => map.dispose(), [map])

  return (
    <meshStandardMaterial
      map={map}
      roughness={0.22}
      metalness={0.08}
      color="#ffffff"
    />
  )
}

const heartPath = (
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number
) => {
  const s = size
  context.moveTo(cx, cy + s * 0.32)
  context.bezierCurveTo(
    cx - s * 0.08,
    cy + s * 0.08,
    cx - s * 0.5,
    cy + s * 0.02,
    cx - s * 0.5,
    cy - s * 0.22
  )
  context.bezierCurveTo(
    cx - s * 0.5,
    cy - s * 0.48,
    cx - s * 0.16,
    cy - s * 0.5,
    cx,
    cy - s * 0.26
  )
  context.bezierCurveTo(
    cx + s * 0.16,
    cy - s * 0.5,
    cx + s * 0.5,
    cy - s * 0.48,
    cx + s * 0.5,
    cy - s * 0.22
  )
  context.bezierCurveTo(
    cx + s * 0.5,
    cy + s * 0.02,
    cx + s * 0.08,
    cy + s * 0.08,
    cx,
    cy + s * 0.32
  )
}

export const useArtworkTexture = () => {
  const map = useMemo(() => {
    const size = 768
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext("2d")
    if (!context) throw new Error("2D canvas context unavailable")

    context.fillStyle = "#f7f1e8"
    context.fillRect(0, 0, size, size)

    const strokes = [
      { color: UNDERGROUND_LINE_COLOURS.central.hex, width: 28, scale: 0.78 },
      {
        color: UNDERGROUND_LINE_COLOURS.piccadilly.hex,
        width: 20,
        scale: 0.62,
      },
      { color: UNDERGROUND_LINE_COLOURS.victoria.hex, width: 14, scale: 0.48 },
      { color: UNDERGROUND_LINE_COLOURS.circle.hex, width: 10, scale: 0.34 },
      { color: UNDERGROUND_LINE_COLOURS.bakerloo.hex, width: 7, scale: 0.22 },
    ]

    for (const stroke of strokes) {
      context.beginPath()
      heartPath(context, size / 2, size / 2 + 18, size * stroke.scale)
      context.strokeStyle = stroke.color
      context.lineWidth = stroke.width
      context.lineJoin = "round"
      context.lineCap = "round"
      context.stroke()
    }

    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.minFilter = LinearFilter
    texture.needsUpdate = true
    return texture
  }, [])

  useEffect(() => () => map.dispose(), [map])
  return map
}
