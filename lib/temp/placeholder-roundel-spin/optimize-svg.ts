import { optimize } from "svgo"

const COLOR_VARIANTS = (hex: string): string[] => {
  const raw = hex.replace("#", "")
  const value = raw.length === 3 ? raw.replace(/./g, (ch) => `${ch}${ch}`) : raw
  const n = Number.parseInt(value, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return [
    hex,
    `#${value}`,
    `#${value.toLowerCase()}`,
    `rgb(${r}, ${g}, ${b})`,
    `rgb(${r},${g},${b})`,
  ]
}

const retintFill = (svg: string, hex: string, opacity: number): string => {
  let next = svg
  for (const token of COLOR_VARIANTS(hex)) {
    next = next.replaceAll(
      `fill:${token};fill-opacity:1`,
      `fill:currentColor;fill-opacity:${opacity}`
    )
    next = next.replaceAll(`fill="${token}"`, `fill="currentColor"`)
    next = next.replaceAll(`fill:${token}`, `fill:currentColor`)
    next = next.replaceAll(`stroke="${token}"`, `stroke="currentColor"`)
    next = next.replaceAll(`stroke:${token}`, `stroke:currentColor`)
  }
  return next
}

export const retintRoundelSvg = (
  svg: string,
  sphereColor: string,
  ringColor: string
): string => {
  const stripped = svg.replace(/\sstyle="background-color:[^"]*"/g, "")
  const retinted = retintFill(
    retintFill(stripped, sphereColor, 0.35),
    ringColor,
    0.85
  )
  return retinted
    .replace(
      /(<circle\b[^>]*\bfill="currentColor")(?![^>]*fill-opacity)/,
      `$1 fill-opacity="0.35"`
    )
    .replace(
      /(<path\b[^>]*\bfill="currentColor")(?![^>]*fill-opacity)/g,
      `$1 fill-opacity="0.85"`
    )
    .replace(
      /(<path\b[^>]*\bstroke="currentColor")(?![^>]*stroke-opacity)/g,
      `$1 stroke-opacity="0.85"`
    )
}

export const optimizeRoundelSvg = (svg: string): string => {
  const { data } = optimize(svg, {
    multipass: true,
    floatPrecision: 1,
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            cleanupIds: false,
            convertShapeToPath: false,
            removeUnknownsAndDefaults: {
              unknownAttrs: false,
              defaultAttrs: false,
            },
          },
        },
      },
      {
        name: "convertPathData",
        params: {
          floatPrecision: 1,
          applyTransforms: true,
          straightCurves: true,
          lineShorthands: true,
          collapseRepeated: true,
          utilizeAbsolute: true,
          negativeExtraSpace: true,
        },
      },
      "mergePaths",
    ],
  })
  return data
}
