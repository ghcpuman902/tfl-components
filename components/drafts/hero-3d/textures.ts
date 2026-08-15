import {
  CanvasTexture,
  LinearFilter,
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

/** Black stencil on white → white-opaque alphaMap (Three.js: white = opaque). */
export const stencilToAlphaMap = (texture: Texture) => {
  const image = texture.image as TexImageSource
  const { width, height } = imageSize(image)
  const { canvas, context } = drawToCanvas(image, width, height)
  const pixels = context.getImageData(0, 0, width, height)
  const data = pixels.data
  for (let i = 0; i < data.length; i += 4) {
    const lum = luminance(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0)
    const opaque = lum < 140 ? 255 : 0
    data[i] = opaque
    data[i + 1] = opaque
    data[i + 2] = opaque
    data[i + 3] = 255
  }
  context.putImageData(pixels, 0, 0)
  texture.image = canvas
  texture.colorSpace = SRGBColorSpace
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true
  return texture
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
