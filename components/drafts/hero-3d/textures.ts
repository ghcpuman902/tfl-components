import {
  CanvasTexture,
  LinearFilter,
  NoColorSpace,
  SRGBColorSpace,
  type Texture,
} from "three"

const luminance = (r: number, g: number, b: number) =>
  0.2126 * r + 0.7152 * g + 0.0722 * b

const drawToCanvas = (image: TexImageSource, width: number, height: number) => {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) throw new Error("2D canvas context unavailable")
  context.drawImage(image as CanvasImageSource, 0, 0, width, height)
  return { canvas, context }
}

const imageSize = (image: TexImageSource) => {
  if ("width" in image && "height" in image) {
    return { width: Number(image.width), height: Number(image.height) }
  }
  return { width: 1024, height: 1024 }
}

/**
 * Black ink on white paper → alphaMap for shadow cutouts.
 * Three.js alphaMap: white = opaque (casts shadow), black = discarded (light passes).
 * Returns a fresh CanvasTexture so the GPU never keeps the raw stencil polarity.
 */
export const stencilToAlphaMap = (source: Texture) => {
  const image = source.image as TexImageSource
  const { width, height } = imageSize(image)
  if (width < 1 || height < 1) {
    throw new Error("stencilToAlphaMap: source image has no dimensions")
  }
  const { canvas, context } = drawToCanvas(image, width, height)
  const pixels = context.getImageData(0, 0, width, height)
  const data = pixels.data
  for (let i = 0; i < data.length; i += 4) {
    const lum = luminance(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0)
    // Dark ink blocks light; paper stays open.
    const opaque = lum < 140 ? 255 : 0
    data[i] = opaque
    data[i + 1] = opaque
    data[i + 2] = opaque
    data[i + 3] = 255
  }
  context.putImageData(pixels, 0, 0)
  const alpha = new CanvasTexture(canvas)
  alpha.colorSpace = NoColorSpace
  alpha.flipY = source.flipY
  alpha.wrapS = source.wrapS
  alpha.wrapT = source.wrapT
  alpha.minFilter = LinearFilter
  alpha.magFilter = LinearFilter
  alpha.generateMipmaps = false
  alpha.needsUpdate = true
  return alpha
}

/** Plant on black → alpha from non-black pixels. */
export const plantAlphaFromBlack = (colorMap: Texture) => {
  const image = colorMap.image as TexImageSource
  const { width, height } = imageSize(image)
  const { canvas, context } = drawToCanvas(image, width, height)
  const pixels = context.getImageData(0, 0, width, height)
  const data = pixels.data
  for (let i = 0; i < data.length; i += 4) {
    const lum = luminance(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0)
    const alpha = lum < 10 ? 0 : 255
    data[i] = alpha
    data[i + 1] = alpha
    data[i + 2] = alpha
    data[i + 3] = 255
  }
  context.putImageData(pixels, 0, 0)
  const alpha = new CanvasTexture(canvas)
  alpha.minFilter = LinearFilter
  alpha.magFilter = LinearFilter
  alpha.needsUpdate = true
  colorMap.colorSpace = SRGBColorSpace
  colorMap.needsUpdate = true
  return alpha
}

export const makeSlotTexture = (
  label: string,
  width: number,
  height: number,
  background: string,
  foreground: string
) => {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) throw new Error("2D canvas context unavailable")
  context.fillStyle = background
  context.fillRect(0, 0, width, height)
  context.strokeStyle = foreground
  context.globalAlpha = 0.18
  context.lineWidth = 2
  context.strokeRect(24, 24, width - 48, height - 48)
  context.globalAlpha = 1
  context.fillStyle = foreground
  context.font = `600 ${Math.round(width * 0.048)}px ui-sans-serif, system-ui, sans-serif`
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.fillText(label, width / 2, height / 2)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}
