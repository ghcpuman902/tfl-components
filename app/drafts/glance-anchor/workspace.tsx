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
/** Across the room shows the two tiles up next; the rest wait for their turn. */
const ROOM_TILES = 2

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

/**
 * Turn order, as words: every line + direction keeps its own number. The stage
 * is "Now · 3 of 5"; the tile that takes over says "Next in 5s"; the rest "5 of 5".
 */
export type SlotTurn = {
  ordinal: number
  count: number
  role: "now" | "next" | "later"
  /** Seconds until the next tile takes the stage; null when touch replaces the timer. */
  nextInS: number | null
} | null

const TurnLabel = ({ turn }: { turn: NonNullable<SlotTurn> }) => {
  const place = `${turn.ordinal} of ${turn.count}`
  if (turn.role === "now")
    return (
      <>
        <span className="hidden @min-[14.5em]/ga-col:inline">Now · </span>
        {place}
      </>
    )
  if (turn.role === "next" && turn.nextInS !== null)
    return (
      <>
        Next in {turn.nextInS}s
        <span className="hidden @min-[20em]/ga-col:inline"> · {place}</span>
      </>
    )
  return <>{place}</>
}

const TimeLockup = ({ time, then }: { time: string; then: string | null }) => (
  <span
    className="flex items-end gap-x-[calc(var(--s)*0.75)] font-semibold tabular-nums"
    aria-hidden
  >
    <span
      className={cn(
        "text-[length:calc(var(--s)*var(--ga-time))]",
        CHIP_CAP_TEXT_BOX_CLASS
      )}
    >
      {time}
    </span>
    <span className="flex flex-col gap-y-[calc(var(--s)*0.5)]">
      <span className={cn(QUIET_CLASS, "whitespace-nowrap")}>
        {time === "Due" ? "now" : "min"}
      </span>
      {then ? (
        <span className={cn(QUIET_CLASS, "whitespace-nowrap")}>{then}</span>
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
  // Across the room: the anchor keeps its shortest bound; a tile is chip, one-line destination, time.
  const roomMeta = room && stage
  const roomTile = room && !stage
  const Tag = onTap ? "button" : "div"

  const spoken = [
    item.owner,
    getLineNameTiers(item.lineId).full,
    item.heading,
    item.destination,
    time === "Due" ? "Due" : `${time} min`,
    showThen && then ? `${then} min` : null,
    turn ? `${turn.ordinal} of ${turn.count}` : null,
    turn?.role === "next" && turn.nextInS !== null
      ? `takes over in ${turn.nextInS} seconds`
      : null,
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
        stage ? "ga-stage-scale" : "ga-tile-scale",
        onTap && "cursor-pointer"
      )}
    >
      <span
        className="w-[calc(var(--s)*0.5)] shrink-0 bg-[var(--line-color)]"
        aria-hidden
      />
      <span className={COL_CLASS}>
        <span className="flex items-center gap-x-[length:var(--c)]" aria-hidden>
          <LineBadge
            lineId={item.lineId}
            name={getLineNameTiers(item.lineId).short}
            className={cn(
              "shrink-0 justify-center px-0",
              CHIP_SIZE_CLASS,
              ARRIVALS_IDENTITY_CHIP_WIDTH_CLASS
            )}
          />
          {turn || item.owner ? (
            <span
              data-slot="ga-turn"
              className={cn(
                "text-[length:calc(var(--c)*1.5)] font-medium whitespace-nowrap",
                turn && "text-muted-foreground",
                CHIP_CAP_TEXT_BOX_CLASS
              )}
            >
              {turn ? <TurnLabel turn={turn} /> : item.owner}
            </span>
          ) : null}
        </span>
        {/* A wrapped name keeps its last line's descent below the baseline; pull it back so the next gap is 1 step. */}
        <span
          className="flex min-w-0 overflow-x-clip [&:has(br)]:mb-[calc(var(--s)*-0.56)]"
          aria-hidden
        >
          <StationName
            name={item.destination}
            layout="auto"
            maxLines={roomTile ? 1 : 2}
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
        {roomMeta ? (
          <span className={cn(QUIET_CLASS, "whitespace-nowrap")} aria-hidden>
            {arrivalsHeadingLadder(item.heading).at(-1)}
          </span>
        ) : null}
        {!roomTile && !roomMeta ? (
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

/** Freshness only: the one bar on screen, neutral and beside its own "Updated" time. */
const GlanceFooter = ({ touch }: { touch: boolean }) => (
  <footer className="@container/ga-foot flex h-12 shrink-0 items-center gap-x-[length:var(--ga-foot)] text-[length:var(--ga-foot)] text-muted-foreground">
    <span className="whitespace-nowrap tabular-nums">Updated 11:50</span>
    <span
      className="relative h-1 w-[calc(var(--ga-foot)*3)] shrink-0 bg-foreground/15"
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
  const stageAt = Math.max(0, active)
  const dwellMs = stageAt === 0 ? ANCHOR_DWELL_MS : TURN_DWELL_MS
  const nextInS = touch
    ? null
    : Math.max(1, Math.ceil(((1 - cycle.progress) * dwellMs) / 1000))
  const turnOf = (index: number, role: "now" | "next" | "later"): SlotTurn =>
    cycling ? { ordinal: index + 1, count: items.length, role, nextInS } : null

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
                turn={turnOf(index, "now")}
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
                turn={turnOf(index, order === 0 ? "next" : "later")}
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
