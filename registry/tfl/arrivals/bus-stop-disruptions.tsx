"use client"

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react"
import { BusNumberChip } from "@/components/tfl/arrivals/bus-number-chip"
import { RiverRouteChip } from "@/components/tfl/arrivals/river-route-chip"
import type { BusStopDisruption } from "@/lib/tfl/prepare-bus-stop-disruptions"
import { riverRouteChipCopy } from "@/lib/tfl/river-bus"
import { cn } from "@/lib/utils"

export type StopDisruptionChipVariant = "bus" | "river"

/**
 * Warning-badge colour for disrupted routes. Not a published TfL Colour
 * Standard entry (there is no official "warning" swatch) — chosen to read
 * as hazard/caution signage (dark ink on amber), distinct from any line or
 * modal brand colour so it never gets mistaken for real line identity.
 */
const BUS_DISRUPTION_WARNING_COLOR = "#F5A300"
const BUS_DISRUPTION_WARNING_INK = "#3A2600"

const TRIGGER_SLOT = "bus-stop-disruption-trigger"

type DisruptionContextValue = {
  disruptions: readonly BusStopDisruption[]
  variant: StopDisruptionChipVariant
  activeLineId: string | null
  setActiveLineId: Dispatch<SetStateAction<string | null>>
}

const DisruptionContext = createContext<DisruptionContextValue | null>(null)

/**
 * Client boundary shared by the header's warning chips and the cover below
 * them. `relative` is the positioning root the cover pins to — it spans
 * header + rows, and the cover's own `top` skips exactly one
 * `--arrivals-row` (the header tile) so it only ever masks the prediction
 * rows, never the chips that opened it.
 *
 * No-ops (renders `children` untouched) when there is nothing to warn about.
 */
export const BusStopDisruptionBoundary = ({
  disruptions,
  variant = "bus",
  children,
}: {
  disruptions: readonly BusStopDisruption[]
  variant?: StopDisruptionChipVariant
  children: ReactNode
}) => {
  const [activeLineId, setActiveLineId] = useState<string | null>(null)

  if (disruptions.length === 0) {
    return <>{children}</>
  }

  return (
    <DisruptionContext.Provider
      value={{ disruptions, variant, activeLineId, setActiveLineId }}
    >
      <div className="relative">{children}</div>
    </DisruptionContext.Provider>
  )
}

/**
 * Badge geometry per chip size — cutout is deliberately larger than the
 * badge. `insetX` / `insetY` pull the badge (and its matching cutout) in
 * from the exact corner so it reads as sitting on the chip rather than
 * mostly hanging off it.
 */
const BADGE_GEOMETRY = {
  sm: {
    badge: 14,
    cutout: 9,
    insetX: 0,
    insetY: 3,
    stroke: [2, 6] as const,
    dot: 2,
    gap: 1.5,
  },
  lg: {
    badge: 20,
    cutout: 13,
    insetX: 0,
    insetY: 4,
    stroke: [2.5, 8] as const,
    dot: 2.5,
    gap: 2,
  },
}

/**
 * Corner mask on the chip itself — a true transparent cutout (not a
 * same-colour ring standing in for a border), centred to match the badge's
 * (inset) position. Whatever sits behind the chip shows through the gap
 * untouched, regardless of the surrounding background.
 */
const cutoutMaskStyle = (
  radiusPx: number,
  insetXPx: number,
  insetYPx: number
): CSSProperties => {
  const mask = `radial-gradient(circle at calc(100% - ${insetXPx}px) ${insetYPx}px, transparent ${radiusPx - 1}px, black ${radiusPx}px)`
  return {
    WebkitMaskImage: mask,
    maskImage: mask,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
  }
}

/** Custom-drawn "!" — a distinct stroke and dot, legible at badge scale where the glyph blurs into one shape. */
const WarningMark = ({
  stroke,
  dot,
  gap,
}: {
  stroke: readonly [number, number]
  dot: number
  gap: number
}) => (
  <span
    className="flex flex-col items-center justify-center"
    style={{ gap }}
    aria-hidden
  >
    <span
      className="rounded-full"
      style={{
        width: stroke[0],
        height: stroke[1],
        backgroundColor: BUS_DISRUPTION_WARNING_INK,
      }}
    />
    <span
      className="rounded-full"
      style={{
        width: dot,
        height: dot,
        backgroundColor: BUS_DISRUPTION_WARNING_INK,
      }}
    />
  </span>
)

/** Route chip with a masked-through warning badge pinned to its top-right corner. */
const DisruptedRouteChip = ({
  lineId,
  variant,
  size = "sm",
  chipClassName,
}: {
  lineId: string
  variant: StopDisruptionChipVariant
  size?: "sm" | "lg"
  chipClassName?: string
}) => {
  const geometry = BADGE_GEOMETRY[size]
  const mask = cutoutMaskStyle(
    geometry.cutout,
    geometry.insetX,
    geometry.insetY
  )
  return (
    <span className="relative inline-flex shrink-0 overflow-visible">
      {variant === "river" ? (
        <RiverRouteChip
          lineId={lineId}
          className={chipClassName}
          style={mask}
        />
      ) : (
        <BusNumberChip label={lineId} className={chipClassName} style={mask} />
      )}
      <span
        className="absolute flex items-center justify-center rounded-full"
        style={{
          top: geometry.insetY - geometry.badge / 2,
          right: geometry.insetX - geometry.badge / 2,
          width: geometry.badge,
          height: geometry.badge,
          backgroundColor: BUS_DISRUPTION_WARNING_COLOR,
        }}
      >
        <WarningMark
          stroke={geometry.stroke}
          dot={geometry.dot}
          gap={geometry.gap}
        />
      </span>
    </span>
  )
}

const disruptionTriggerLabel = (
  variant: StopDisruptionChipVariant,
  lineId: string,
  description: string
): string => {
  const identity =
    variant === "river"
      ? riverRouteChipCopy(lineId).ariaLabel
      : `Route ${lineId}`
  return `${identity} disruption: ${description}`
}

/**
 * Header trigger row — one warning chip per disrupted route, painted
 * inline after the stop name. Mouse hover opens; tap/`click` toggles.
 * Hover is `pointerType === "mouse"` only — touch also synthesises
 * `mouseenter` then `click` in one gesture, and the click would toggle
 * the cover straight back shut. Any other chip dims to `opacity-50`
 * while one is active so the open one reads as selected.
 *
 * Triggers sit on the title baseline, immediately after the name.
 * Neighbours share a zero-gap hit strip (padding is inside each button)
 * so the pointer never crosses a dead zone that would blink the cover
 * closed. Painted chip stays `h-5` / `text-xs` / `5ch`.
 */
export const BusStopDisruptionChips = ({
  className,
}: {
  className?: string
}) => {
  const ctx = useContext(DisruptionContext)
  if (!ctx || ctx.disruptions.length === 0) return null
  const { disruptions, variant, activeLineId, setActiveLineId } = ctx

  return (
    <div className={cn("flex shrink-0 items-center pr-2", className)}>
      {disruptions.map((disruption) => {
        const isActive = activeLineId === disruption.lineId
        const isDimmed = activeLineId !== null && !isActive
        return (
          <button
            key={disruption.lineId}
            type="button"
            data-slot={TRIGGER_SLOT}
            className={cn(
              "flex shrink-0 items-center justify-center px-1.5 transition-opacity first:pl-1",
              isDimmed && "opacity-50"
            )}
            aria-expanded={isActive}
            aria-label={disruptionTriggerLabel(
              variant,
              disruption.lineId,
              disruption.description
            )}
            onPointerEnter={(event) => {
              if (event.pointerType !== "mouse") return
              setActiveLineId(disruption.lineId)
            }}
            onPointerLeave={(event) => {
              if (event.pointerType !== "mouse") return
              setActiveLineId((current) =>
                current === disruption.lineId ? null : current
              )
            }}
            onClick={() =>
              setActiveLineId((current) =>
                current === disruption.lineId ? null : disruption.lineId
              )
            }
          >
            <DisruptedRouteChip
              lineId={disruption.lineId}
              variant={variant}
              size="sm"
            />
          </button>
        )
      })}
    </div>
  )
}

/**
 * Cover over the prediction rows for the active disruption — the larger
 * chip inline with its full description text. A solid surface a shade
 * darker than the page background (not a translucent copy of it) so the
 * cover reads as its own panel. Tapping/clicking anywhere outside the
 * cover and the trigger row closes it.
 */
export const BusStopDisruptionCover = () => {
  const ctx = useContext(DisruptionContext)
  const coverRef = useRef<HTMLDivElement>(null)
  const active =
    ctx?.disruptions.find((d) => d.lineId === ctx.activeLineId) ?? null

  useEffect(() => {
    if (!ctx || !active) return
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (coverRef.current?.contains(target)) return
      if (target?.closest(`[data-slot="${TRIGGER_SLOT}"]`)) return
      ctx.setActiveLineId(null)
    }
    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [ctx, active])

  if (!ctx || !active) return null

  return (
    <div
      ref={coverRef}
      className="absolute inset-x-0 top-[var(--arrivals-row)] bottom-0 z-10 flex items-start bg-muted p-3"
      role="status"
    >
      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-base text-pretty text-foreground">
        <DisruptedRouteChip
          lineId={active.lineId}
          variant={ctx.variant}
          size="lg"
          chipClassName="h-8 w-[6ch] text-base"
        />
        {active.description}
      </p>
    </div>
  )
}
