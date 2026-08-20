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

/** Three.js alphaMap: white = opaque (blocks light), black = discarded (light passes). */
const canvasToAlphaMap = (canvas: HTMLCanvasElement) => {
  const alpha = new CanvasTexture(canvas)
  alpha.colorSpace = NoColorSpace
  alpha.minFilter = LinearFilter
  alpha.magFilter = LinearFilter
  alpha.generateMipmaps = false
  alpha.needsUpdate = true
  return alpha
}

/**
 * Black ink on white paper → alphaMap for shadow cutouts.
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
    const opaque = lum < 140 ? 255 : 0
    data[i] = opaque
    data[i + 1] = opaque
    data[i + 2] = opaque
    data[i + 3] = 255
  }
  context.putImageData(pixels, 0, 0)
  const alpha = canvasToAlphaMap(canvas)
  alpha.flipY = source.flipY
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
    const opaque = lum < 10 ? 0 : 255
    data[i] = opaque
    data[i + 1] = opaque
    data[i + 2] = opaque
    data[i + 3] = 255
  }
  context.putImageData(pixels, 0, 0)
  const alpha = canvasToAlphaMap(canvas)
  colorMap.colorSpace = SRGBColorSpace
  colorMap.needsUpdate = true
  return alpha
}

const traceArchedWindow = (
  context: CanvasRenderingContext2D,
  left: number,
  right: number,
  sill: number,
  spring: number
) => {
  const cx = (left + right) / 2
  const radius = (right - left) / 2
  context.beginPath()
  context.moveTo(left, spring)
  context.lineTo(left, sill)
  context.lineTo(right, sill)
  context.lineTo(right, spring)
  // Canvas Y is down; clockwise from west to east goes through the top.
  context.arc(cx, spring, radius, Math.PI, 0, false)
  context.closePath()
}

/**
 * Opaque surround with a large arched opening. Thin lead cames divide the glass
 * (not a chunky sash grid). Surround blocks sun so the room stays dark outside
 * the pool.
 */
export const makeWindowApertureAlphaMap = (
  width = 1536,
  height = 1792
) => {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) throw new Error("2D canvas context unavailable")

  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, width, height)

  const openW = width * 0.58
  const left = (width - openW) / 2
  const right = left + openW
  const apex = height * 0.1
  const radius = openW / 2
  const spring = apex + radius
  const sill = height * 0.86

  // Glass (black = light passes).
  context.fillStyle = "#000000"
  traceArchedWindow(context, left, right, sill, spring)
  context.fill()

  context.save()
  traceArchedWindow(context, left, right, sill, spring)
  context.clip()

  context.strokeStyle = "#ffffff"
  context.lineCap = "butt"
  context.lineJoin = "miter"

  const cols = 7
  const rows = 8
  const came = Math.max(3, width * 0.0032)
  const transom = came * 1.45
  const bodyH = sill - spring
  const rowH = bodyH / rows

  context.lineWidth = came
  for (let col = 1; col < cols; col += 1) {
    const x = left + (openW * col) / cols
    context.beginPath()
    context.moveTo(x, sill)
    context.lineTo(x, apex)
    context.stroke()
  }

  // Same pitch above and below the springing so arch cells match the lower grid.
  const topRows = Math.ceil((spring - apex) / rowH)
  for (let row = 1; row < rows + topRows; row += 1) {
    const y = sill - row * rowH
    if (y <= apex + came) continue
    context.beginPath()
    context.moveTo(left, y)
    context.lineTo(right, y)
    context.stroke()
  }

  context.lineWidth = transom
  context.beginPath()
  context.moveTo(left, spring)
  context.lineTo(right, spring)
  context.stroke()

  context.restore()

  context.strokeStyle = "#ffffff"
  context.lineWidth = came * 1.35
  traceArchedWindow(context, left, right, sill, spring)
  context.stroke()

  return canvasToAlphaMap(canvas)
}

const mulberry32 = (seed: number) => {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const drawLeaf = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  width: number
) => {
  context.save()
  context.translate(x, y)
  context.rotate(angle)
  context.beginPath()
  context.moveTo(0, 0)
  context.quadraticCurveTo(width * 0.55, length * 0.35, 0, length)
  context.quadraticCurveTo(-width * 0.55, length * 0.35, 0, 0)
  context.fill()
  context.restore()
}

/**
 * Canopy gobo: open sky with large leaf/branch ink so silhouettes stay readable
 * after orthographic projection through the window.
 */
export const makeLeafLayerAlphaMap = (
  seed: number,
  width = 1600,
  height = 1400,
  density = 1
) => {
  const rand = mulberry32(seed)
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) throw new Error("2D canvas context unavailable")

  context.fillStyle = "#000000"
  context.fillRect(0, 0, width, height)
  context.fillStyle = "#ffffff"
  context.strokeStyle = "#ffffff"
  context.lineCap = "round"
  context.lineJoin = "round"

  const trunks = 3 + Math.floor(rand() * 2)
  for (let t = 0; t < trunks; t += 1) {
    const x = width * (0.16 + rand() * 0.68)
    const y = height * (0.14 + rand() * 0.1)
    const branches = 4 + Math.floor(rand() * 3)

    for (let b = 0; b < branches; b += 1) {
      const angle = 0.45 + rand() * 1.0
      const len = height * (0.28 + rand() * 0.32)
      const steps = 8
      context.lineWidth = 8 + rand() * 10
      context.beginPath()
      context.moveTo(x, y)
      let px = x
      let py = y
      for (let s = 0; s < steps; s += 1) {
        px += Math.cos(angle + (rand() - 0.5) * 0.4) * (len / steps)
        py += Math.sin(angle + (rand() - 0.5) * 0.28) * (len / steps)
        context.lineTo(px, py)
        const along = 3 + Math.floor(rand() * 3 * density)
        for (let L = 0; L < along; L += 1) {
          drawLeaf(
            context,
            px + (rand() - 0.5) * 40,
            py + (rand() - 0.5) * 40,
            angle + (rand() - 0.5) * 1.6,
            70 + rand() * 110,
            28 + rand() * 42
          )
        }
      }
      context.stroke()
    }
  }

  const clusters = Math.floor(32 * density)
  for (let c = 0; c < clusters; c += 1) {
    const cx = width * (0.14 + rand() * 0.72)
    const cy = height * (0.14 + rand() * 0.62)
    const n = 10 + Math.floor(rand() * 16 * density)
    for (let i = 0; i < n; i += 1) {
      drawLeaf(
        context,
        cx + (rand() - 0.5) * 200,
        cy + (rand() - 0.5) * 160,
        rand() * Math.PI * 2,
        55 + rand() * 130,
        22 + rand() * 48
      )
    }
  }

  return canvasToAlphaMap(canvas)
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
