/**
 * Cycle hire map camera + frame helpers (MapLibre-free — keep SDK in client surfaces).
 *
 * Markers use anchor `"center"`: the lng/lat is the pin centre. Labels are
 * absolutely positioned (CSS `position-try: flip-block` analogue): try below,
 * flip above when that box would hit another pin, another label, or the map
 * edge / attribution strip.
 *
 * Frame classes size the map *and* any skeleton the same way — map fills the
 * parent; the parent owns aspect / max-height so mobile pages can scroll past.
 */

/** Map pin label box — fit policy measures against this width. */
export const CYCLE_HIRE_MAP_LABEL_WIDTH_PX = 112
export const CYCLE_HIRE_MAP_LABEL_FONT_SIZE_PX = 11
export const CYCLE_HIRE_MAP_LABEL_MAX_LINES = 2
/** Matches `gap-0.5` between pin and label. */
export const CYCLE_HIRE_MAP_PIN_LABEL_GAP_PX = 2

/**
 * Default docs / preview frame: stable aspect, capped height on small viewports
 * so the map does not eat the whole scrollport.
 */
export const CYCLE_HIRE_MAP_FRAME_CLASSNAME =
  "aspect-[4/3] w-full max-h-[min(42svh,28rem)]"

/**
 * Homepage arrivals-rhythm frame — fixed tile height, no aspect (override the
 * default frame with `aspect-auto max-h-none` + this class on the parent).
 */
export const CYCLE_HIRE_MAP_HOME_FRAME_CLASSNAME =
  "h-[calc(var(--arrivals-row)*6)] w-full"

/** Breathing room past the pin/label box. */
export const CYCLE_HIRE_MAP_EDGE_BREATHING_PX = 8
/** Compact MapLibre attribution strip (fallback when not measured). */
export const CYCLE_HIRE_MAP_ATTRIBUTION_FALLBACK_PX = 28
/** NavigationControl width — applied on the right only. */
export const CYCLE_HIRE_MAP_NAV_RIGHT_PX = 40

export type CycleHireMapEdgePadding = {
  top: number
  bottom: number
  left: number
  right: number
}

export type CycleHirePinExtent = {
  /** px above the lng/lat (half pin, plus label when flipped). */
  above: number
  /** px below the lng/lat (half pin + gap + label when hanging down). */
  below: number
  /** px left/right of the lng/lat to cover centred label (or pin). */
  halfWidth: number
}

export type CycleHireLabelSide = "below" | "above"

export type CycleHireScreenPin = {
  id: string
  x: number
  y: number
}

export type CycleHireFitPaddingOptions = {
  showNavigation?: boolean
  above?: number
  below?: number
  halfWidth?: number
  /** Measured attribution / bottom-control height. */
  attributionHeight?: number
  /**
   * `"below"` (default): labels hang down — top padding is half the pin.
   * `"both"`: some labels flipped up — top padding includes a label box.
   */
  labelClearance?: "below" | "both"
}

type LabelBox = { left: number; top: number; width: number; height: number }

export const cycleHireLabelHeightPx = (): number =>
  CYCLE_HIRE_MAP_LABEL_FONT_SIZE_PX * CYCLE_HIRE_MAP_LABEL_MAX_LINES

/** Pixel extent of one dock pin relative to its centre lng/lat. */
export const estimateCycleHirePinExtent = (
  markerSize: number,
  labelClearance: "below" | "both" = "below"
): CycleHirePinExtent => {
  const labelHeight = cycleHireLabelHeightPx()
  const halfPin = markerSize / 2
  const labelStack = CYCLE_HIRE_MAP_PIN_LABEL_GAP_PX + labelHeight
  return {
    above: labelClearance === "both" ? halfPin + labelStack : halfPin,
    below: halfPin + labelStack,
    halfWidth: Math.max(halfPin, CYCLE_HIRE_MAP_LABEL_WIDTH_PX / 2),
  }
}

export const cycleHireLabelRect = (
  pin: CycleHireScreenPin,
  side: CycleHireLabelSide,
  markerSize: number
): LabelBox => {
  const radius = markerSize / 2
  const height = cycleHireLabelHeightPx()
  const top =
    side === "below"
      ? pin.y + radius + CYCLE_HIRE_MAP_PIN_LABEL_GAP_PX
      : pin.y - radius - CYCLE_HIRE_MAP_PIN_LABEL_GAP_PX - height
  return {
    left: pin.x - CYCLE_HIRE_MAP_LABEL_WIDTH_PX / 2,
    top,
    width: CYCLE_HIRE_MAP_LABEL_WIDTH_PX,
    height,
  }
}

const boxesOverlap = (a: LabelBox, b: LabelBox): boolean =>
  a.left < b.left + b.width &&
  a.left + a.width > b.left &&
  a.top < b.top + b.height &&
  a.top + a.height > b.top

const circleHitsBox = (
  cx: number,
  cy: number,
  radius: number,
  box: LabelBox
): boolean => {
  const nearestX = Math.max(box.left, Math.min(cx, box.left + box.width))
  const nearestY = Math.max(box.top, Math.min(cy, box.top + box.height))
  const dx = cx - nearestX
  const dy = cy - nearestY
  return dx * dx + dy * dy < radius * radius
}

/**
 * CSS `position-try: flip-block` analogue: prefer below, flip above when that
 * box would cover another pin, overlap a placed label, or leave the map.
 */
export const resolveCycleHireLabelSides = (
  pins: readonly CycleHireScreenPin[],
  options: {
    markerSize: number
    mapWidth: number
    mapHeight: number
    attributionHeight?: number
  }
): Map<string, CycleHireLabelSide> => {
  const sides = new Map<string, CycleHireLabelSide>()
  const radius = options.markerSize / 2
  const mapBottom = options.mapHeight - (options.attributionHeight ?? 0)
  const placed: LabelBox[] = []

  const fits = (pin: CycleHireScreenPin, side: CycleHireLabelSide): boolean => {
    const box = cycleHireLabelRect(pin, side, options.markerSize)
    if (box.top < 0 || box.top + box.height > mapBottom) return false
    if (box.left < 0 || box.left + box.width > options.mapWidth) return false
    if (
      pins.some(
        (other) =>
          other.id !== pin.id && circleHitsBox(other.x, other.y, radius, box)
      )
    ) {
      return false
    }
    return !placed.some((other) => boxesOverlap(box, other))
  }

  const northFirst = [...pins].sort((a, b) => a.y - b.y)
  for (const pin of northFirst) {
    const side: CycleHireLabelSide =
      fits(pin, "below") || !fits(pin, "above") ? "below" : "above"
    sides.set(pin.id, side)
    placed.push(cycleHireLabelRect(pin, side, options.markerSize))
  }
  return sides
}

/**
 * Asymmetric `fitBounds` padding so every pin + station label clears the
 * viewport, including the OSM attribution strip. Top is half the pin unless
 * labels may flip up (`labelClearance: "both"`).
 */
export const cycleHireFitPadding = (
  markerSize: number,
  options?: CycleHireFitPaddingOptions
): CycleHireMapEdgePadding => {
  const estimated = estimateCycleHirePinExtent(
    markerSize,
    options?.labelClearance ?? "below"
  )
  const above = options?.above ?? estimated.above
  const below = options?.below ?? estimated.below
  const halfWidth = options?.halfWidth ?? estimated.halfWidth
  const attribution =
    options?.attributionHeight ?? CYCLE_HIRE_MAP_ATTRIBUTION_FALLBACK_PX
  const navRight =
    options?.showNavigation === true ? CYCLE_HIRE_MAP_NAV_RIGHT_PX : 0

  return {
    top: CYCLE_HIRE_MAP_EDGE_BREATHING_PX + above,
    right: CYCLE_HIRE_MAP_EDGE_BREATHING_PX + halfWidth + navRight,
    bottom: CYCLE_HIRE_MAP_EDGE_BREATHING_PX + below + attribution,
    left: CYCLE_HIRE_MAP_EDGE_BREATHING_PX + halfWidth,
  }
}

/**
 * MapLibre rejects padding that fills the canvas. Keep the bottom-heavy ratio.
 */
export const clampCycleHireFitPadding = (
  padding: CycleHireMapEdgePadding,
  mapWidth: number,
  mapHeight: number
): CycleHireMapEdgePadding => {
  const maxVertical = Math.max(0, mapHeight - 8)
  const maxHorizontal = Math.max(0, mapWidth - 8)
  const vertical = padding.top + padding.bottom
  const horizontal = padding.left + padding.right
  const vScale =
    vertical > maxVertical && vertical > 0 ? maxVertical / vertical : 1
  const hScale =
    horizontal > maxHorizontal && horizontal > 0
      ? maxHorizontal / horizontal
      : 1
  return {
    top: padding.top * vScale,
    bottom: padding.bottom * vScale,
    left: padding.left * hScale,
    right: padding.right * hScale,
  }
}
