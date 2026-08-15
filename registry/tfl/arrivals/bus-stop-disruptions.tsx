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
import type { BusStopDisruption } from "@/lib/tfl/bus-stop-disruptions"
import { cn } from "@/lib/utils"

export type { BusStopDisruption }

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
  children,
}: {
  disruptions: readonly BusStopDisruption[]
  children: ReactNode
}) => {
  const [activeLineId, setActiveLineId] = useState<string | null>(null)

  if (disruptions.length === 0) {
    return <>{children}</>
  }

  return (
    <DisruptionContext.Provider
      value={{ disruptions, activeLineId, setActiveLineId }}
    >
      <div className="relative">{children}</div>
    </DisruptionContext.Provider>
  )
}

/**
 * Badge geometry per chip size — cutout is deliberately larger than the
 * badge. `inset` pulls the badge (and its matching cutout) a few px in from
 * the exact corner so it reads as sitting on the chip rather than mostly
 * hanging off it.
 */
const BADGE_GEOMETRY = {
  sm: { badge: 14, cutout: 9, inset: 3, stroke: [2, 6] as const, dot: 2, gap: 1.5 },
  lg: { badge: 20, cutout: 13, inset: 4, stroke: [2.5, 8] as const, dot: 2.5, gap: 2 },
}

/**
 * Corner mask on the chip itself — a true transparent cutout (not a
 * same-colour ring standing in for a border), centred to match the badge's
 * (inset) position. Whatever sits behind the chip shows through the gap
 * untouched, regardless of the surrounding background.
 */
const cutoutMaskStyle = (radiusPx: number, insetPx: number): CSSProperties => {
  const mask = `radial-gradient(circle at calc(100% - ${insetPx}px) ${insetPx}px, transparent ${radiusPx - 1}px, black ${radiusPx}px)`
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
const DisruptedBusNumberChip = ({
  label,
  size = "sm",
  chipClassName,
}: {
  label: string
  size?: "sm" | "lg"
  chipClassName?: string
}) => {
  const geometry = BADGE_GEOMETRY[size]
  return (
    <span className="relative inline-flex shrink-0">
      <BusNumberChip
        label={label}
        className={chipClassName}
        style={cutoutMaskStyle(geometry.cutout, geometry.inset)}
      />
      <span
        className="absolute flex -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full"
        style={{
          top: geometry.inset,
          right: geometry.inset,
          width: geometry.badge,
          height: geometry.badge,
          backgroundColor: BUS_DISRUPTION_WARNING_COLOR,
        }}
      >
        <WarningMark stroke={geometry.stroke} dot={geometry.dot} gap={geometry.gap} />
      </span>
    </span>
  )
}

/**
 * Header trigger row — one warning chip per disrupted route, painted
 * inline after the stop name. Hover opens on desktop, tap opens on
 * touch (`onClick` fires for both); any other chip dims to `opacity-50`
 * while one is active so the open one reads as selected.
 *
 * Each trigger's hit area spans the title row height and butts up
 * against its neighbour with zero gap (visual spacing comes from
 * padding *inside* each button) — moving the pointer from one chip to
 * the next never crosses a dead zone that would blink the cover closed.
 *
 * Painted chip stays at arrival-row size (`h-5` / `text-xs` / `5ch`).
 * Title-relative `ex` on the same node as height collapses the padding.
 */
export const BusStopDisruptionChips = ({
  className,
}: {
  className?: string
}) => {
  const ctx = useContext(DisruptionContext)
  if (!ctx || ctx.disruptions.length === 0) return null
  const { disruptions, activeLineId, setActiveLineId } = ctx

  return (
    <div className={cn("flex h-full items-stretch", className)}>
      {disruptions.map((disruption) => {
        const isActive = activeLineId === disruption.lineId
        const isDimmed = activeLineId !== null && !isActive
        return (
          <button
            key={disruption.lineId}
            type="button"
            data-slot={TRIGGER_SLOT}
            className={cn(
              "flex shrink-0 items-center justify-center px-1.5 first:pl-1 transition-opacity",
              isDimmed && "opacity-50"
            )}
            aria-expanded={isActive}
            aria-label={`Route ${disruption.lineId} disruption: ${disruption.description}`}
            onMouseEnter={() => setActiveLineId(disruption.lineId)}
            onMouseLeave={() =>
              setActiveLineId((current) =>
                current === disruption.lineId ? null : current
              )
            }
            onClick={() =>
              setActiveLineId((current) =>
                current === disruption.lineId ? null : disruption.lineId
              )
            }
          >
            <DisruptedBusNumberChip
              label={disruption.lineId}
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
        <DisruptedBusNumberChip
          label={active.lineId}
          size="lg"
          chipClassName="h-8 w-[6ch] text-base"
        />
        {active.description}
      </p>
    </div>
  )
}
