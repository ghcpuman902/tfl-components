"use client"

import { useEffect, useMemo, useState, type CSSProperties } from "react"
import {
  ARRIVALS_IDENTITY_CHIP_WIDTH_CLASS,
  CHIP_CAP_TEXT_BOX_CLASS,
} from "@/components/tfl/arrivals/chip-text"
import { LineBadge } from "@/components/tfl/brand/line-badge"
import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel"
import { StationName, StationNameTitle } from "@/components/tfl/station-name"
import { getLineNameTiers } from "@/lib/tfl/line-names"
import { arrivalsHeadingLadder } from "@/lib/tfl/station-abbreviations"
import { cn } from "@/lib/utils"
import {
  ANCHOR_ITEMS,
  HOUSEHOLD_ITEMS,
  type GlanceAnchorItem,
} from "./fixtures"
import "./glance-anchor.css"

export type GlanceAnchorLayout = "anchor" | "household"

export type GlanceAnchorMockProps = {
  layout: GlanceAnchorLayout
  /** "Across the room": fewer facts, bigger unit. */
  room: boolean
  /** Touch allowed: no auto-cycle; segments and tiles are tap targets. */
  touch: boolean
  width: number
  height: number
  /** Freeze the cycle at segment `active` and `progress` (0–1) for screenshots. */
  freeze?: { active: number; progress: number }
}

/** Anchor dwells longest; every other item gets a short turn. */
const ANCHOR_DWELL_MS = 12_000
const TURN_DWELL_MS = 5_000
const FRESHNESS = 0.4
/** Across the room shows three tiles; the rest wait for their turn. */
const ROOM_TILES = 3

const minutes = (seconds: number) =>
  seconds < 60 ? "Due" : `${Math.floor(seconds / 60)}`

const thenLine = (times: readonly number[]) => {
  const rest = times.slice(1, 3).map(minutes)
  return rest.length ? `then ${rest.join(", ")}` : null
}

/* One left-aligned stack per slot, so every fact sits beside its own rail and
 * nothing floats toward a neighbour: chip, destination, meta, then the time. */
const SLOT_CLASS =
  "ga-slot flex min-h-0 min-w-0 gap-x-[length:var(--s)] self-start text-left"
/* Font size is the slot step, so the column's container queries read in s. */
const COL_CLASS =
  "@container/ga-col flex min-w-0 flex-1 flex-col gap-y-[length:var(--s)] text-[length:var(--s)]"
const CHIP_SIZE_CLASS =
  "h-[calc(var(--c)*2.5)] text-[length:calc(var(--c)*1.5)]"
const DEST_CLASS = "font-medium text-[length:calc(var(--s)*2)] leading-[1.15]"
const QUIET_CLASS =
  "m-0 font-medium text-[length:calc(var(--s)*1.5)] leading-tight text-muted-foreground [text-box:trim-both_cap_alphabetic]"
const META_TIER_CLASS = [
  "hidden @min-[13em]/ga-meta:inline",
  "hidden @min-[9.5em]/ga-meta:inline @min-[13em]/ga-meta:hidden",
  "@min-[9.5em]/ga-meta:hidden",
] as const

/** Place in the turn order: the stage says which of how many, the next tile says so. */
export type SlotTurn =
  | { kind: "stage"; ordinal: number; count: number; progress: number | null }
  | { kind: "next" }
  | null

const TimeLockup = ({
  time,
  then,
}: {
  time: string
  then: string | null
}) => (
  <span
    className="flex items-end gap-x-[calc(var(--s)*0.75)] font-semibold tabular-nums"
    aria-hidden
  >
    <span
      className={cn("text-[length:calc(var(--s)*4)]", CHIP_CAP_TEXT_BOX_CLASS)}
    >
      {time}
    </span>
    <span className="flex flex-col gap-y-[calc(var(--s)*0.5)]">
      {time === "Due" ? null : (
        <span className={cn(QUIET_CLASS, "whitespace-nowrap")}>min</span>
      )}
      {then ? (
        <span className={cn(QUIET_CLASS, "whitespace-nowrap")}>
          {then}
          {/* Tier: drop the repeated unit before anything shrinks. "Due" is the widest figure. */}
          <span
            className={
              time === "Due"
                ? "hidden @min-[17.75em]/ga-col:inline"
                : "hidden @min-[15.25em]/ga-col:inline"
            }
          >
            {" "}
            min
          </span>
        </span>
      ) : null}
    </span>
  </span>
)

const GlanceSlot = ({
  item,
  stage,
  room,
  reveal,
  turn,
  onTap,
}: {
  item: GlanceAnchorItem
  stage: boolean
  room: boolean
  /** Show following times: always unattended, on tap when touch is allowed. */
  reveal: boolean
  turn: SlotTurn
  onTap?: () => void
}) => {
  const [first = 0] = item.times
  const time = minutes(first)
  const then = thenLine(item.times)
  const showThen = !room && (stage || reveal)
  const showMeta = !room || !stage
  const showDest = !(room && !stage)
  // Across the room a tile is two lines: chip with its shortest bound, then the time.
  const inlineMeta = room && !stage
  const Tag = onTap ? "button" : "div"
  const label =
    turn?.kind === "stage"
      ? `${turn.ordinal} of ${turn.count}`
      : turn?.kind === "next"
        ? "Next"
        : item.owner
  const progress = turn?.kind === "stage" ? turn.progress : null
  const spoken = [
    item.owner,
    getLineNameTiers(item.lineId).full,
    item.heading,
    item.destination,
    time === "Due" ? "Due" : `${time} min`,
    showThen && then ? `${then} min` : null,
    turn?.kind === "next" ? "next" : null,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <Tag
      type={onTap ? "button" : undefined}
      onClick={onTap}
      data-line={item.lineId}
      data-slot={stage ? "ga-stage" : "ga-tile"}
      aria-label={spoken}
      className={cn(
        SLOT_CLASS,
        stage ? "[--ck:1.5] [--k:2]" : "[--ck:1] [--k:1]",
        onTap && "cursor-pointer"
      )}
    >
      {/* The rail is the turn's progress when the slot is on a timer. */}
      <span
        data-slot="ga-rail"
        className={cn(
          "relative w-[calc(var(--s)*0.5)] shrink-0 bg-[var(--line-color)]",
          progress !== null && "bg-[color-mix(in_srgb,var(--line-color)_30%,transparent)]"
        )}
        aria-hidden
      >
        {progress !== null ? (
          <span
            className="absolute inset-x-0 top-0 bg-[var(--line-color)]"
            style={{ height: `${Math.round(progress * 100)}%` }}
          />
        ) : null}
      </span>
      <span className={COL_CLASS}>
        <span
          className="flex items-center gap-x-[length:var(--s)]"
          aria-hidden
        >
          <LineBadge
            lineId={item.lineId}
            name={getLineNameTiers(item.lineId).short}
            className={cn(
              "shrink-0 justify-center px-0",
              CHIP_SIZE_CLASS,
              ARRIVALS_IDENTITY_CHIP_WIDTH_CLASS
            )}
          />
          {inlineMeta ? (
            <span className={cn(QUIET_CLASS, "whitespace-nowrap")}>
              {arrivalsHeadingLadder(item.heading).at(-1)}
            </span>
          ) : null}
          {label ? (
            <span
              data-slot="ga-turn"
              className={cn(
                "text-[length:calc(var(--c)*1.5)] font-medium whitespace-nowrap",
                turn ? "text-muted-foreground" : null,
                CHIP_CAP_TEXT_BOX_CLASS
              )}
            >
              {label}
            </span>
          ) : null}
        </span>
        {showDest ? (
          <span className="flex min-w-0 overflow-x-clip" aria-hidden>
            <StationName
              name={item.destination}
              layout="auto"
              maxLines={2}
              allowAbbreviation
              abbreviationTier={3}
              fitBeforePaint
              nowrap={false}
              className={cn(
                "line-clamp-2 text-balance [&>span>span]:[text-box:trim-both_cap_alphabetic]",
                DEST_CLASS
              )}
            />
          </span>
        ) : null}
        {showMeta && !inlineMeta ? (
          <span
            className={cn("@container/ga-meta text-balance", QUIET_CLASS)}
            aria-hidden
          >
            {arrivalsHeadingLadder(item.heading).map((text, tier) => (
              <span key={tier} className={META_TIER_CLASS[tier]}>
                {text}
              </span>
            ))}
          </span>
        ) : null}
        <TimeLockup time={time} then={showThen ? then : null} />
      </span>
    </Tag>
  )
}

/** Freshness only: neutral, inline, short — never reads as the segment bar. */
const GlanceFooter = ({ touch }: { touch: boolean }) => (
  <footer className="@container/ga-foot flex h-12 shrink-0 items-center gap-x-[calc(var(--u)*1.5)] text-[length:var(--ga-foot)] text-muted-foreground">
    <span className="whitespace-nowrap tabular-nums">Updated 11:50</span>
    <span
      className="relative h-1 w-[calc(var(--ga-foot)*4)] shrink-0 bg-foreground/15"
      aria-hidden
    >
      <span
        className="absolute inset-y-0 left-0 bg-foreground/50"
        style={{ width: `${FRESHNESS * 100}%` }}
      />
    </span>
    {touch ? (
      <button
        type="button"
        className="h-12 whitespace-nowrap text-foreground underline-offset-4 hover:underline"
      >
        Refresh
      </button>
    ) : null}
    <span className="ml-auto whitespace-nowrap">
      <span className="hidden @min-[24rem]/ga-foot:inline">Powered by </span>
      TfL Open Data.
    </span>
  </footer>
)

const useCycle = (
  count: number,
  enabled: boolean,
  freeze?: { active: number; progress: number }
) => {
  const turns = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        ms: index === 0 ? ANCHOR_DWELL_MS : TURN_DWELL_MS,
      })),
    [count]
  )
  const [state, setState] = useState({ turn: 0, progress: 0 })

  useEffect(() => {
    if (!enabled || freeze || turns.length === 0) return
    let raf = 0
    let start = performance.now()
    let turn = 0
    const tick = (now: number) => {
      const ms = turns[turn]?.ms ?? TURN_DWELL_MS
      let progress = (now - start) / ms
      if (progress >= 1) {
        turn = (turn + 1) % turns.length
        start = now
        progress = 0
      }
      setState({ turn, progress })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [enabled, freeze, turns])

  if (freeze) return { active: freeze.active, progress: freeze.progress }
  return {
    active: turns[state.turn]?.index ?? 0,
    progress: enabled ? state.progress : 0,
  }
}

export const GlanceAnchorMock = ({
  layout,
  room,
  touch,
  width,
  height,
  freeze,
}: GlanceAnchorMockProps) => {
  const items = layout === "household" ? HOUSEHOLD_ITEMS : ANCHOR_ITEMS
  const cycle = useCycle(items.length, layout === "anchor" && !touch, freeze)
  const [tapped, setTapped] = useState<number | null>(null)
  const active =
    layout === "household"
      ? (tapped ?? -1)
      : touch
        ? (tapped ?? 0)
        : cycle.active

  const cycling = layout === "anchor"
  // Anchor layout: the active item takes the stage; tiles follow in turn order.
  const stageIndexes = cycling ? [Math.max(0, active)] : [0, 1]
  const tileIndexes = items
    .map((_, index) => (cycling ? (active + 1 + index) % items.length : index))
    .filter((index) => !stageIndexes.includes(index))
    .slice(0, room ? ROOM_TILES : undefined)
  const stageTurn: SlotTurn = cycling
    ? {
        kind: "stage",
        ordinal: Math.max(0, active) + 1,
        count: items.length,
        progress: touch ? null : cycle.progress,
      }
    : null

  return (
    <div
      data-slot="ga-shell"
      className="glance-anchor board-embed box-border overflow-hidden bg-background text-foreground"
      style={{ width, height }}
    >
      <div
        className="ga-inner box-border flex h-full flex-col gap-y-[length:var(--u)] p-[length:var(--ga-pad)]"
        data-layout={layout}
        data-room={room || undefined}
        style={{ "--ga-pad": width < 600 ? "20px" : "24px" } as CSSProperties}
      >
        <header className="box-border flex h-[length:var(--ga-roundel)] shrink-0 items-center gap-x-[calc(var(--u)*1.5)] overflow-clip">
          <TfLRoundel
            variant="underground"
            className="size-[length:var(--ga-roundel)] shrink-0"
            aria-hidden
          />
          <h1 className="tfl-title min-w-0 flex-1 text-[length:var(--ga-title)] leading-tight [font-weight:var(--tfl-title-weight,400)] text-balance [font-synthesis:none]">
            <StationNameTitle name="Oxford Circus" />
          </h1>
        </header>
        <div className="ga-grid grid min-h-0 flex-1 grid-flow-row-dense gap-[calc(var(--u)*var(--ga-gutter))]">
          {stageIndexes.map((index) => {
            const item = items[index]
            return item ? (
              <GlanceSlot
                key={`stage-${item.id}`}
                item={item}
                stage
                room={room}
                reveal
                turn={stageTurn}
              />
            ) : null
          })}
          {tileIndexes.map((index, order) => {
            const item = items[index]
            return item ? (
              <GlanceSlot
                key={item.id}
                item={item}
                stage={false}
                room={room}
                reveal={!touch || index === tapped}
                turn={cycling && !touch && order === 0 ? { kind: "next" } : null}
                onTap={touch ? () => setTapped(index) : undefined}
              />
            ) : null
          })}
        </div>
        <GlanceFooter touch={touch} />
      </div>
    </div>
  )
}
