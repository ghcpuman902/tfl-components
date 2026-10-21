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
  return rest.length ? `then ${rest.join(", ")} min` : null
}

const SLOT_CLASS =
  "ga-slot grid min-h-0 min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] content-center gap-x-[length:var(--s)] gap-y-[length:var(--s)] text-left"
const RAIL_CLASS =
  "col-start-1 row-start-1 w-[calc(var(--s)*0.5)] bg-[var(--line-color)]"
/* The rail spans exactly the rows painted, so it never runs past the text. */
const RAIL_SPAN = [
  "",
  "row-span-1",
  "row-span-2",
  "row-span-3",
  "row-span-4",
] as const
const ROW_START = [
  "",
  "row-start-1",
  "row-start-2",
  "row-start-3",
  "row-start-4",
] as const
const CHIP_SIZE_CLASS =
  "h-[calc(var(--s)*2.5)] text-[length:calc(var(--s)*1.5)]"
const DEST_CLASS = "font-medium text-[length:calc(var(--s)*2)] leading-[1.15]"
const QUIET_CLASS =
  "col-start-2 m-0 font-medium text-[length:calc(var(--s)*1.5)] leading-tight text-muted-foreground [text-box:trim-both_cap_alphabetic]"
const META_TIER_CLASS = [
  "hidden @min-[13em]/ga-meta:inline",
  "hidden @min-[9.5em]/ga-meta:inline @min-[13em]/ga-meta:hidden",
  "@min-[9.5em]/ga-meta:hidden",
] as const

const GlanceSlot = ({
  item,
  stage,
  room,
  reveal,
  onTap,
}: {
  item: GlanceAnchorItem
  stage: boolean
  room: boolean
  /** Show following times: always unattended, on tap when touch is allowed. */
  reveal: boolean
  onTap?: () => void
}) => {
  const [first = 0] = item.times
  const time = minutes(first)
  const then = thenLine(item.times)
  const showThen = !room && (stage || reveal)
  const showMeta = !room || !stage
  const showDest = !(room && !stage)
  const destRow = 2
  const metaRow = showDest ? 3 : 2
  const thenRow = metaRow + 1
  const rows =
    1 + Number(showDest) + Number(showMeta) + Number(showThen && Boolean(then))
  // Quiet lines run under the minutes only when the minutes have their own two rows.
  const quietSpan = showDest ? "col-span-2" : "col-span-1"
  const Tag = onTap ? "button" : "div"
  const spoken = [
    item.owner,
    getLineNameTiers(item.lineId).full,
    item.heading,
    item.destination,
    time === "Due" ? "Due" : `${time} min`,
    showThen ? then : null,
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
        stage ? "[--k:2]" : "[--k:1]",
        onTap && "cursor-pointer"
      )}
    >
      <span className={cn(RAIL_CLASS, RAIL_SPAN[rows])} aria-hidden />
      <span
        className="col-start-2 row-start-1 flex items-center gap-x-[length:var(--s)]"
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
        {item.owner ? (
          <span
            className={cn(
              "text-[length:calc(var(--s)*1.5)] font-medium",
              CHIP_CAP_TEXT_BOX_CLASS
            )}
          >
            {item.owner}
          </span>
        ) : null}
      </span>
      {showDest ? (
        <span
          className={cn(
            "col-start-2 flex min-w-0 overflow-x-clip",
            ROW_START[destRow]
          )}
          aria-hidden
        >
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
      {showMeta ? (
        <span
          className={cn(
            "@container/ga-meta text-balance",
            QUIET_CLASS,
            quietSpan,
            ROW_START[metaRow]
          )}
          aria-hidden
        >
          {arrivalsHeadingLadder(item.heading).map((text, tier) => (
            <span key={tier} className={META_TIER_CLASS[tier]}>
              {text}
            </span>
          ))}
        </span>
      ) : null}
      {showThen && then ? (
        <span
          className={cn(QUIET_CLASS, quietSpan, ROW_START[thenRow])}
          aria-hidden
        >
          {then}
        </span>
      ) : null}
      <span
        className="col-start-3 row-span-2 row-start-1 flex flex-col items-end justify-center gap-y-[calc(var(--s)*0.5)] self-center pl-[calc(var(--s)*0.5)] font-semibold tabular-nums"
        aria-hidden
      >
        <span
          className={cn(
            "min-w-[2ch] text-right text-[length:calc(var(--s)*4)]",
            CHIP_CAP_TEXT_BOX_CLASS
          )}
        >
          {time}
        </span>
        {time === "Due" ? null : (
          <span
            className={cn(
              "text-[length:calc(var(--s)*1.5)] font-medium text-muted-foreground",
              CHIP_CAP_TEXT_BOX_CLASS
            )}
          >
            min
          </span>
        )}
      </span>
    </Tag>
  )
}

/** `weight` mirrors the slot: a named anchor's segment is twice a tile's. */
type Segment = { item: GlanceAnchorItem; pinned: boolean; weight: 1 | 2 }

/** Structure before detail: one segment per line + direction, in line colour. */
const SegmentBar = ({
  segments,
  active,
  progress,
  touch,
  onSkip,
}: {
  segments: readonly Segment[]
  active: number
  progress: number
  touch: boolean
  onSkip: (index: number) => void
}) => (
  <ol
    data-slot="ga-segments"
    className="m-0 flex h-[calc(var(--u)*0.5)] shrink-0 list-none gap-x-[calc(var(--u)*0.5)] p-0"
    aria-label={`${segments.length} departures`}
  >
    {segments.map((segment, index) => {
      const isActive = index === active
      const fill = segment.pinned
        ? 1
        : isActive
          ? progress
          : index < active
            ? 1
            : 0
      const Tag = touch && !segment.pinned ? "button" : "span"
      return (
        <li
          key={segment.item.id}
          data-line={segment.item.lineId}
          className={cn(
            "relative min-w-0 transition-[flex-grow] duration-300 ease-out",
            isActive && !segment.pinned
              ? "grow-[3]"
              : segment.weight === 2
                ? "grow-[2]"
                : "grow"
          )}
          aria-current={isActive || undefined}
        >
          <Tag
            type={Tag === "button" ? "button" : undefined}
            onClick={Tag === "button" ? () => onSkip(index) : undefined}
            aria-label={`${segment.item.owner ?? getLineNameTiers(segment.item.lineId).full} ${segment.item.heading}`}
            className={cn(
              "absolute inset-0 block overflow-hidden",
              Tag === "button" &&
                "after:absolute after:inset-x-0 after:-inset-y-5 after:content-['']"
            )}
          >
            <span className="absolute inset-0 bg-[var(--line-color)] opacity-30" />
            <span
              className="absolute inset-y-0 left-0 bg-[var(--line-color)]"
              style={{ width: `${Math.round(fill * 100)}%` }}
            />
          </Tag>
        </li>
      )
    })}
  </ol>
)

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
  segments: readonly Segment[],
  enabled: boolean,
  freeze?: { active: number; progress: number }
) => {
  const turns = useMemo(
    () =>
      segments.flatMap((segment, index) =>
        segment.pinned
          ? []
          : [{ index, ms: index === 0 ? ANCHOR_DWELL_MS : TURN_DWELL_MS }]
      ),
    [segments]
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
  const segments = useMemo<Segment[]>(
    () =>
      items.map((item, index) => ({
        item,
        // Household fits every item on screen, so nothing takes turns.
        pinned: layout === "household",
        weight: layout === "household" && index < 2 ? 2 : 1,
      })),
    [items, layout]
  )
  const cycle = useCycle(segments, !touch, freeze)
  const [tapped, setTapped] = useState<number | null>(null)
  const active =
    layout === "household"
      ? (tapped ?? -1)
      : touch
        ? (tapped ?? 0)
        : cycle.active

  // Anchor layout: the active item takes the stage; tiles keep segment order.
  const stageIndexes = layout === "household" ? [0, 1] : [Math.max(0, active)]
  // Across the room only shows what is up next after the current turn.
  const tileIndexes = items
    .map((_, index) => (room ? (active + 1 + index) % items.length : index))
    .filter((index) => !stageIndexes.includes(index))
    .slice(0, room ? ROOM_TILES : undefined)

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
        <SegmentBar
          segments={segments}
          active={active}
          progress={touch ? 0 : cycle.progress}
          touch={touch}
          onSkip={setTapped}
        />
        <div className="ga-grid grid min-h-0 flex-1 grid-flow-row-dense gap-[calc(var(--u)*1.5)]">
          {stageIndexes.map((index) => {
            const item = items[index]
            return item ? (
              <GlanceSlot
                key={`stage-${item.id}`}
                item={item}
                stage
                room={room}
                reveal
              />
            ) : null
          })}
          {tileIndexes.map((index) => {
            const item = items[index]
            return item ? (
              <GlanceSlot
                key={item.id}
                item={item}
                stage={false}
                room={room}
                reveal={!touch || index === tapped}
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
