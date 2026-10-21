"use client"

import { RefreshCw } from "lucide-react"
import {
  useEffect,
  useState,
  type CSSProperties,
  type TransitionEvent,
} from "react"
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
  OVERFLOW_ITEMS,
  PAIR_ITEMS,
  type GlanceAnchorItem,
} from "./fixtures"
import "./glance-anchor.css"

export type GlanceAnchorLayout = "anchor" | "pair"

export type GlanceAnchorMockProps = {
  /** One anchor, or two equal anchors. */
  layout: GlanceAnchorLayout
  /** "Across the room": fewer facts, bigger unit. */
  room: boolean
  /** Touch allowed: tapping a tile pins it as the anchor; the tile strip scrolls. */
  touch: boolean
  /** Seven line + directions, more than the tile slots. */
  overflow: boolean
  width: number
  height: number
  /** Item index pinned as the anchor (default: the first by board priority). */
  pin?: number
  /** Freeze the unattended pan at this column offset (e.g. 0.5 = mid-pan) for screenshots. */
  pan?: number
}

/** Unattended overflow: hold each column of tiles, then pan one column. */
const PAN_HOLD_MS = 10_000
const PAN_MOVE_MS = 1_600
const FRESHNESS = 0.4

const minutes = (seconds: number) =>
  seconds < 60 ? "Due" : `${Math.floor(seconds / 60)}`

const thenLine = (times: readonly number[]) => {
  const rest = times.slice(1, 3).map(minutes)
  return rest.length ? `then ${rest.join(", ")}` : null
}

/* One left-aligned stack per slot, so every fact sits beside its own rail and
 * nothing floats toward a neighbour: chip, destination, meta, then the time.
 * Slots stretch to their row; the time sits on the slot's bottom edge, so rails
 * and times of one row end on one line whatever the destination wraps to. */
const SLOT_CLASS =
  "ga-slot flex min-h-0 min-w-0 gap-x-[length:var(--s)] text-left"
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

const TimeLockup = ({ time, then }: { time: string; then: string | null }) => (
  <span
    className="mt-auto flex items-end gap-x-[length:var(--s)] font-semibold tabular-nums"
    aria-hidden
  >
    {/* Hammersmith One's figures sit ~0.02em under the trimmed baseline; lift them so the ink ends where the rail does. */}
    <span
      className={cn(
        "-translate-y-[0.02em] text-[length:calc(var(--s)*var(--ga-time))]",
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
  onTap,
}: {
  item: GlanceAnchorItem
  stage: boolean
  room: boolean
  onTap?: () => void
}) => {
  const [first = 0] = item.times
  const time = minutes(first)
  const then = room ? null : thenLine(item.times)
  // Across the room: the anchor keeps its shortest bound; a tile is chip, one-line destination, time.
  const roomMeta = room && stage
  const roomTile = room && !stage
  const Tag = onTap ? "button" : "div"
  const spoken = [
    getLineNameTiers(item.lineId).full,
    item.heading,
    item.destination,
    time === "Due" ? "Due" : `${time} min`,
    then ? `${then} min` : null,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <Tag
      type={onTap ? "button" : undefined}
      onClick={onTap}
      data-line={item.lineId}
      data-slot={stage ? "ga-stage" : "ga-tile"}
      aria-label={onTap ? `${spoken}. Show large` : spoken}
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
        <TimeLockup time={time} then={then} />
      </span>
    </Tag>
  )
}

/** Freshness only: the one bar on screen, neutral and beside its own "Updated" time. */
const GlanceFooter = () => (
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
    <span className="ml-auto whitespace-nowrap">
      <span className="hidden @min-[24rem]/ga-foot:inline">Powered by </span>
      TfL Open Data.
    </span>
  </footer>
)

/**
 * Unattended overflow: hold, then pan one column; after the last column the
 * strip shows clones of the first and snaps back to 0 with no transition.
 */
const usePan = (columns: number, enabled: boolean) => {
  const [offset, setOffset] = useState(0)
  const [animate, setAnimate] = useState(true)

  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => {
      setAnimate(true)
      setOffset((value) => value + 1)
    }, PAN_HOLD_MS + PAN_MOVE_MS)
    return () => window.clearInterval(id)
  }, [enabled])

  const onTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || offset < columns) return
    setAnimate(false)
    setOffset(0)
  }
  return { offset, animate, onTransitionEnd }
}

const TileArea = ({
  tiles,
  room,
  touch,
  visible,
  rows,
  pan,
  onPin,
}: {
  tiles: readonly GlanceAnchorItem[]
  room: boolean
  touch: boolean
  /** Whole tiles that fit (columns × rows). */
  visible: number
  rows: number
  pan?: number
  onPin: (id: string) => void
}) => {
  const overflow = tiles.length > visible
  const columns = Math.ceil(tiles.length / rows)
  const auto = overflow && !touch && pan === undefined
  const cycle = usePan(columns, auto)
  // The unattended strip repeats its first page so the pan can loop forward.
  const strip =
    overflow && !touch ? [...tiles, ...tiles.slice(0, visible)] : tiles
  const offset = pan ?? cycle.offset

  const more = overflow && !touch ? tiles.length - visible : 0

  return (
    <div className="ga-tile-area relative flex min-h-0 min-w-0">
      <div
        data-slot="ga-tiles"
        data-overflow={overflow ? (touch ? "scroll" : "pan") : undefined}
        className="ga-tiles @container/ga-tiles min-h-0 min-w-0 flex-1"
      >
        <div
          className="ga-strip"
          style={
            {
              "--ga-offset": offset,
              transitionDuration:
                auto && cycle.animate ? `${PAN_MOVE_MS}ms` : "0ms",
            } as CSSProperties
          }
          onTransitionEnd={cycle.onTransitionEnd}
        >
          {strip.map((item, index) => (
            <GlanceSlot
              key={`${item.id}-${index}`}
              item={item}
              stage={false}
              room={room}
              onTap={touch ? () => onPin(item.id) : undefined}
            />
          ))}
        </div>
      </div>
      {/* Unattended overflow: the one hint, in words, under the strip it belongs to. */}
      {more > 0 ? (
        <span
          data-slot="ga-more"
          className={cn(
            QUIET_CLASS,
            "absolute top-[calc(100%+var(--u)*1.5)] left-0 text-[length:calc(var(--u)*1.5)] whitespace-nowrap tabular-nums"
          )}
        >
          +{more} more
        </span>
      ) : null}
    </div>
  )
}

const ITEMS = { anchor: ANCHOR_ITEMS, pair: PAIR_ITEMS } as const

export const GlanceAnchorMock = ({
  layout,
  room,
  touch,
  overflow,
  width,
  height,
  pin,
  pan,
}: GlanceAnchorMockProps) => {
  const items = overflow ? OVERFLOW_ITEMS : ITEMS[layout]
  // Board settings order the items by priority; a tap pins one as the anchor until another tap.
  const [pinned, setPinned] = useState<string | null>(
    pin === undefined ? null : (items[pin]?.id ?? null)
  )
  const anchorIds =
    layout === "pair"
      ? items.slice(0, 2).map((item) => item.id)
      : [pinned ?? items[0]?.id]
  const anchors = items.filter((item) => anchorIds.includes(item.id))
  const tiles = items.filter((item) => !anchorIds.includes(item.id))
  const portrait = height > width
  const rows = room
    ? portrait
      ? 1
      : 2
    : layout === "pair" && !portrait
      ? 1
      : 2
  const cols = room ? 1 : layout === "pair" && !portrait ? 4 : 2
  const visible = rows * cols

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
        data-peek={(touch && tiles.length > visible) || undefined}
        style={
          {
            "--ga-pad": width < 600 ? "20px" : "24px",
            "--ga-tile-cols": cols,
            "--ga-tile-rows": rows,
          } as CSSProperties
        }
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
          {/* Touch only: a manual refresh in the header, so the footer is just freshness and credit. */}
          {touch ? (
            <button
              type="button"
              className="inline-flex h-12 shrink-0 items-center gap-x-[calc(var(--ga-foot)*0.375)] text-[length:var(--ga-foot)] whitespace-nowrap underline-offset-4 hover:underline"
            >
              <RefreshCw className="size-[1em] shrink-0" aria-hidden />
              Refresh
            </button>
          ) : null}
        </header>
        <div className="ga-grid grid min-h-0 flex-1 gap-[calc(var(--u)*var(--ga-gutter))]">
          {anchors.map((item) => (
            <GlanceSlot
              key={`stage-${item.id}`}
              item={item}
              stage
              room={room}
            />
          ))}
          <TileArea
            tiles={tiles}
            room={room}
            touch={touch}
            visible={visible}
            rows={rows}
            pan={pan}
            onPin={setPinned}
          />
        </div>
        <GlanceFooter />
      </div>
    </div>
  )
}
