"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type TransitionEvent,
} from "react"
import type {
  PredictionWithSharedTrackIdentity,
  RealtimePrediction,
} from "tfl-ts"
import {
  ARRIVALS_IDENTITY_CHIP_WIDTH_CLASS,
  CHIP_CAP_TEXT_BOX_CLASS,
} from "@/components/tfl/arrivals/chip-text"
import { LineBadge, LineBadgeGroup } from "@/components/tfl/brand/line-badge"
import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel"
import { StationName, StationNameTitle } from "@/components/tfl/station-name"
import { resolveArrivalsDestinationText } from "@/lib/tfl/arrivals-destination-text"
import type { ArrivalsEmptyKind } from "@/lib/tfl/arrivals-empty"
import { ARRIVALS_EMPTY_COPY } from "@/lib/tfl/arrivals-empty"
import { compareArrivalsLines } from "@/lib/tfl/arrivals-line-sort"
import {
  buildGlancePanStrip,
  formatGlanceArrivalMeta,
  formatGlanceCountdown,
  formatGlanceThen,
  GLANCE_PAN_HOLD_MS,
  GLANCE_PAN_MOVE_MS,
  GLANCE_VISIBLE_TILES,
  glancePanColumns,
  groupGlanceArrivals,
  nextGlancePanOffset,
  prepareGlanceArrivals,
  resolveGlanceLayout,
  type GlanceGroup,
  type GlancePriorityItem,
} from "@/lib/tfl/board-glance-arrivals"
import {
  readGlancePin,
  writeGlancePin,
} from "@/lib/tfl/board-glance-pin-storage"
import { usableTflText } from "@/lib/tfl/bus-stop-letter"
import { useFontsReady } from "@/lib/use-fonts-ready"
import { getLineNameTiers, joinLineNames } from "@/lib/tfl/line-names"
import { arrivalsHeadingLadder } from "@/lib/tfl/station-abbreviations"
import { cn } from "@/lib/utils"

export type BoardGlanceArrivalsProps = {
  data?: readonly RealtimePrediction[]
  stopName?: string
  stopPointId?: string
  /** Board priority (`a.priority`): line + direction, most important first. */
  priority?: readonly GlancePriorityItem[]
  /** Visible line order (`a.lines`), used after priority. */
  lineOrder?: readonly string[]
  /** Two equal anchors (`a.pair`) when there are two groups to show. */
  pair?: boolean
  /** Touch allowed: tap a tile to pin it as the anchor; overflow scrolls. Otherwise the strip pans. */
  interactive?: boolean
  /** Across the room, few trains: the anchor and the one or two tiles that fit, larger. */
  room?: boolean
  now?: number
  loading?: boolean
  error?: string | null
  emptyKind?: ArrivalsEmptyKind
  emptyMessage?: string
  className?: string
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
}

/* One left-aligned stack per slot beside its rail: chip, destination, meta, time. Slots stretch to their row. */
const SLOT_CLASS =
  "glance-slot flex min-h-0 min-w-0 gap-x-[length:var(--glance-s)] text-left"
/* Font size is the slot step, so the column's container queries read in steps. */
const COL_CLASS =
  "@container/glance-col flex min-w-0 flex-1 flex-col gap-y-[length:var(--glance-s)] text-[length:var(--glance-s)]"
const CHIP_SIZE_CLASS =
  "h-[calc(var(--glance-s)*2.5)] text-[length:calc(var(--glance-s)*1.5)]"
/* Board row weight (no synthetic bold, so canvas fit matches paint); leading matches StationName's multiline. */
const DEST_CLASS =
  "font-medium text-[length:calc(var(--glance-s)*2)] leading-[1.15]"
const QUIET_CLASS =
  "m-0 font-medium text-[length:calc(var(--glance-s)*1.5)] leading-tight text-muted-foreground [text-box:trim-both_cap_alphabetic]"
/* First heading tier that fits, by the widest form in meta em. */
const META_TIER_CLASS = [
  "hidden @min-[13em]/glance-meta:inline",
  "hidden @min-[9.5em]/glance-meta:inline @min-[13em]/glance-meta:hidden",
  "@min-[9.5em]/glance-meta:hidden",
] as const
const SKELETON_FILL_CLASS = "animate-pulse bg-muted text-transparent"

type GlanceIdentity = {
  lineId: string
  chip: ReactNode
  lineLabel?: string
}

const glanceIdentity = (arrival: RealtimePrediction): GlanceIdentity => {
  const tagged = arrival as PredictionWithSharedTrackIdentity
  const rawLineId = arrival.lineId?.trim() || ""
  const identity = tagged.sharedTrackIdentity
  const canonicalLineId =
    identity?.confidence === "exclusive-segment"
      ? identity.canonicalLineId.trim()
      : undefined
  const lineId = canonicalLineId || rawLineId
  const remapped = Boolean(canonicalLineId) && canonicalLineId !== rawLineId
  const sharedChipIds =
    identity?.confidence === "ambiguous" && identity.rawLineIds.length >= 2
      ? [...identity.rawLineIds]
          .map((id) => id.trim())
          .filter(Boolean)
          .sort((a, b) =>
            compareArrivalsLines(
              { lineId: a, lineName: getLineNameTiers(a).full },
              { lineId: b, lineName: getLineNameTiers(b).full }
            )
          )
      : []
  if (sharedChipIds.length >= 2) {
    return {
      lineId: sharedChipIds[0] ?? lineId,
      lineLabel: joinLineNames(
        sharedChipIds.map((id) => getLineNameTiers(id).full)
      ),
      chip: (
        <LineBadgeGroup
          variant="codes"
          lineIds={sharedChipIds}
          className={CHIP_SIZE_CLASS}
        />
      ),
    }
  }
  const tiers = lineId
    ? getLineNameTiers(lineId, remapped ? undefined : arrival.lineName)
    : null
  return {
    lineId,
    lineLabel: tiers?.full,
    chip:
      tiers && lineId ? (
        <LineBadge
          lineId={lineId}
          name={tiers.short}
          className={cn(
            "shrink-0 justify-center px-0",
            CHIP_SIZE_CLASS,
            ARRIVALS_IDENTITY_CHIP_WIDTH_CLASS
          )}
        />
      ) : null,
  }
}

const TimeLockup = ({ time, then }: { time: string; then: string | null }) => {
  const unit = time === "Due" ? "now" : /^\d+$/.test(time) ? "min" : null
  return (
    <span
      data-slot="board-glance-time"
      className="flex items-end gap-x-[length:var(--glance-s)] font-semibold tabular-nums"
      aria-hidden
    >
      {/* Hammersmith One's figures sit ~0.02em under the trimmed baseline; lift them so the ink ends where the rail does. */}
      <span
        className={cn(
          "-translate-y-[0.02em] text-[length:calc(var(--glance-s)*var(--glance-time))]",
          CHIP_CAP_TEXT_BOX_CLASS
        )}
      >
        {time}
      </span>
      {unit || then ? (
        <span className="flex flex-col gap-y-[calc(var(--glance-s)*0.5)]">
          {unit ? (
            <span className={cn(QUIET_CLASS, "whitespace-nowrap")}>{unit}</span>
          ) : null}
          {then ? (
            <span className={cn(QUIET_CLASS, "whitespace-nowrap")}>{then}</span>
          ) : null}
        </span>
      ) : null}
    </span>
  )
}

const GlanceSlot = ({
  group,
  stage,
  room,
  onPin,
}: {
  group: GlanceGroup
  stage: boolean
  room: boolean
  onPin?: (key: string) => void
}) => {
  const first = group.rows[0]
  if (!first) return null
  const arrival = first.arrival
  const identity = glanceIdentity(arrival)
  const rawDestination =
    usableTflText(arrival.towards) ||
    usableTflText(arrival.destinationName) ||
    "Unknown"
  const destination = resolveArrivalsDestinationText({
    destination: rawDestination,
    lineName: identity.lineLabel,
    currentLocation: usableTflText(arrival.currentLocation),
  })
  const meta = formatGlanceArrivalMeta(arrival.platformName)
  const time = formatGlanceCountdown(
    arrival.timeToStation,
    arrival.platformName
  )
  const then = room ? null : formatGlanceThen(group.rows)
  // Across the room: the anchor keeps its shortest bound; a tile is chip, one-line destination, time.
  const roomTile = room && !stage
  const spoken = [
    identity.lineLabel,
    meta,
    destination,
    /^\d+$/.test(time) ? `${time} min` : time,
    then ? `${then} min` : null,
  ]
    .filter(Boolean)
    .join(", ")
  const Tag = onPin ? "button" : "div"

  return (
    <Tag
      type={onPin ? "button" : undefined}
      onClick={onPin ? () => onPin(group.key) : undefined}
      data-slot={stage ? "board-glance-anchor" : "board-glance-tile"}
      data-group={group.key}
      role={onPin ? undefined : "group"}
      aria-label={onPin ? `${spoken}. Show large` : spoken}
      className={cn(
        SLOT_CLASS,
        stage ? "glance-stage-scale" : "glance-tile-scale",
        onPin && "cursor-pointer"
      )}
    >
      <span
        data-line={identity.lineId || undefined}
        className={cn(
          "w-[calc(var(--glance-s)*0.5)] shrink-0",
          identity.lineId ? "bg-[var(--line-color)]" : "bg-muted"
        )}
        aria-hidden
      />
      <span className={COL_CLASS}>
        <span
          className="glance-chip-row flex items-center gap-x-[length:var(--glance-s)]"
          aria-hidden
        >
          {identity.chip}
        </span>
        {/* The name's box is trimmed to cap top and last baseline by margins (.glance-dest), so its gaps read as 1 step; descenders hang free. */}
        <span className="glance-dest flex min-w-0 overflow-x-clip" aria-hidden>
          <StationName
            name={destination}
            layout="auto"
            maxLines={roomTile ? 1 : 2}
            allowAbbreviation
            abbreviationTier={3}
            fitBeforePaint
            allowScaleDown={false}
            nowrap={false}
            className={cn("text-balance", DEST_CLASS)}
          />
        </span>
        {roomTile ? null : (
          <span
            data-slot="board-glance-meta"
            className={cn("@container/glance-meta text-balance", QUIET_CLASS)}
            aria-hidden
          >
            {meta
              ? room
                ? arrivalsHeadingLadder(meta).at(-1)
                : arrivalsHeadingLadder(meta).map((text, tier) => (
                    <span key={tier} className={META_TIER_CLASS[tier]}>
                      {text}
                    </span>
                  ))
              : (identity.lineLabel ?? "Next train")}
          </span>
        )}
        <TimeLockup time={time} then={then} />
      </span>
    </Tag>
  )
}

const SkeletonSlot = ({ stage }: { stage: boolean }) => (
  <div
    className={cn(
      SLOT_CLASS,
      stage ? "glance-stage-scale" : "glance-tile-scale"
    )}
    aria-hidden
  >
    <span
      className={cn(
        "w-[calc(var(--glance-s)*0.5)] shrink-0",
        SKELETON_FILL_CLASS
      )}
    />
    <span className={COL_CLASS}>
      <span className="glance-chip-row flex">
        <span
          className={cn(
            CHIP_SIZE_CLASS,
            ARRIVALS_IDENTITY_CHIP_WIDTH_CLASS,
            SKELETON_FILL_CLASS
          )}
        />
      </span>
      <span
        className={cn(
          "w-3/4 [text-box:trim-both_cap_alphabetic]",
          DEST_CLASS,
          SKELETON_FILL_CLASS
        )}
      >
        {" "}
      </span>
      <span className={cn("w-1/2", QUIET_CLASS, SKELETON_FILL_CLASS)}> </span>
      <span
        className={cn(
          "w-[2ch] text-[length:calc(var(--glance-s)*var(--glance-time))]",
          CHIP_CAP_TEXT_BOX_CLASS,
          SKELETON_FILL_CLASS
        )}
      >
        0
      </span>
    </span>
  </div>
)

/**
 * Unattended overflow: hold each column, then pan one column; after the last
 * real column the strip shows the cloned first page and snaps back to 0 with
 * no transition. Reduced motion jumps a column instead of sliding. Rows come
 * from the strip's own CSS (container queries), read only when it moves.
 */
const stripRows = (strip: Element | null) =>
  (strip &&
    Number.parseInt(
      getComputedStyle(strip).getPropertyValue("--glance-tile-rows"),
      10
    )) ||
  2

const useGlancePan = (tileCount: number, enabled: boolean) => {
  const stripRef = useRef<HTMLDivElement>(null)
  const [pan, setPan] = useState({ offset: 0, animate: true })

  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => {
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
      const total = glancePanColumns(tileCount, stripRows(stripRef.current))
      setPan((current) => {
        const next = nextGlancePanOffset(current.offset, total)
        const jumpHome = next.snap || (reduce && next.offset >= total)
        return jumpHome
          ? { offset: 0, animate: false }
          : { offset: next.offset, animate: !reduce }
      })
    }, GLANCE_PAN_HOLD_MS + GLANCE_PAN_MOVE_MS)
    return () => window.clearInterval(id)
  }, [enabled, tileCount])

  const onTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    const total = glancePanColumns(tileCount, stripRows(event.currentTarget))
    if (pan.offset < total) return
    setPan({ offset: 0, animate: false })
  }

  return { stripRef, offset: pan.offset, animate: pan.animate, onTransitionEnd }
}

const GlanceTileArea = ({
  tiles,
  room,
  interactive,
  onPin,
}: {
  tiles: readonly GlanceGroup[]
  room: boolean
  interactive: boolean
  onPin: (key: string) => void
}) => {
  const overflow = !room && tiles.length > GLANCE_VISIBLE_TILES
  const pans = overflow && !interactive
  const { stripRef, offset, animate, onTransitionEnd } = useGlancePan(
    tiles.length,
    pans
  )
  const strip = pans ? buildGlancePanStrip(tiles) : tiles
  const more = pans ? tiles.length - GLANCE_VISIBLE_TILES : 0

  return (
    <div className="glance-tile-area relative flex min-h-0 min-w-0">
      <div
        data-slot="board-glance-tiles"
        data-overflow={overflow ? (interactive ? "scroll" : "pan") : undefined}
        className="glance-tiles @container min-h-0 min-w-0 flex-1"
      >
        <div
          ref={stripRef}
          className="glance-strip"
          style={
            {
              "--glance-offset": pans ? offset : 0,
              transitionDuration:
                pans && animate ? `${GLANCE_PAN_MOVE_MS}ms` : "0ms",
            } as CSSProperties
          }
          onTransitionEnd={pans ? onTransitionEnd : undefined}
        >
          {strip.map((group, index) =>
            group ? (
              <GlanceSlot
                key={`${group.key}-${index}`}
                group={group}
                stage={false}
                room={room}
                onPin={interactive ? onPin : undefined}
              />
            ) : (
              <span key={`pad-${index}`} className="glance-pad" aria-hidden />
            )
          )}
        </div>
      </div>
      {/* Unattended overflow: the one hint, in words, under the strip it belongs to. */}
      {more > 0 ? (
        <span
          data-slot="board-glance-more"
          className={cn(
            QUIET_CLASS,
            "absolute top-[calc(100%+var(--glance-u)*1.5)] left-0 text-[length:calc(var(--glance-u)*1.5)] whitespace-nowrap tabular-nums"
          )}
        >
          +{more} more
        </span>
      ) : null}
    </div>
  )
}

/**
 * Room-distance glance Board: next trains grouped by line + direction in fixed
 * positions. One anchor (priority first, or a tapped tile) beside quarter
 * tiles; a pair board shows two equal anchors. Overflow tiles scroll on touch
 * and pan on unattended screens. Sizes are container units only — no layout
 * measuring after paint.
 */
export const BoardGlanceArrivals = ({
  data,
  stopName,
  stopPointId,
  priority,
  lineOrder,
  pair = false,
  interactive = false,
  room = false,
  now,
  loading = false,
  error = null,
  emptyMessage,
  className,
  headingLevel = 2,
}: BoardGlanceArrivalsProps) => {
  // Glance mounts only after the board has hydrated, so the stored pin is read before first paint.
  const [pinnedKey, setPinnedKey] = useState<string | null>(() =>
    interactive && stopPointId ? readGlancePin(stopPointId) : null
  )
  const groups = useMemo(
    () =>
      groupGlanceArrivals(prepareGlanceArrivals({ data: data ?? [], now }), {
        priority,
        lineOrder,
      }),
    [data, lineOrder, now, priority]
  )
  const layout = resolveGlanceLayout(groups, {
    pinnedKey: interactive ? pinnedKey : null,
    pair,
  })
  const handlePin = useCallback(
    (key: string) => {
      setPinnedKey(key)
      if (stopPointId) writeGlancePin(stopPointId, key)
    },
    [stopPointId]
  )

  const fontsReady = useFontsReady()
  const TitleTag = `h${headingLevel}` as const
  const emptyCopy = emptyMessage ?? ARRIVALS_EMPTY_COPY.empty
  const showSkeleton = loading && groups.length === 0 && !error
  const layoutName = showSkeleton ? (pair ? "pair" : "anchor") : layout.layout

  return (
    <div
      data-slot="board-glance-arrivals"
      data-glance-layout={layoutName}
      data-glance-room={room || undefined}
      data-glance-touch={interactive || undefined}
      data-glance-peek={
        (interactive && !room && layout.tiles.length > GLANCE_VISIBLE_TILES) ||
        undefined
      }
      className={cn(
        "board-glance-scale flex min-h-0 w-full flex-1 flex-col gap-y-[length:var(--glance-u)]",
        !fontsReady && "invisible",
        className
      )}
      aria-busy={showSkeleton || undefined}
    >
      <div className="box-border flex h-[length:var(--glance-roundel)] shrink-0 items-center gap-x-[calc(var(--glance-u)*1.5)] overflow-clip">
        <TfLRoundel
          variant="underground"
          className="size-[length:var(--glance-roundel)] shrink-0"
          aria-hidden
        />
        {stopName ? (
          <TitleTag className="tfl-title min-w-0 flex-1 text-[length:var(--glance-title)] leading-tight [font-weight:var(--tfl-title-weight,400)] text-balance [font-synthesis:none]">
            <StationNameTitle name={stopName} fitBeforePaint />
          </TitleTag>
        ) : (
          <TitleTag className="sr-only">Arrivals</TitleTag>
        )}
      </div>

      {showSkeleton ? (
        <div
          className="glance-grid min-h-0 flex-1"
          aria-label="Loading arrivals"
        >
          {Array.from({ length: pair ? 2 : 1 }).map((_, index) => (
            <SkeletonSlot key={`anchor-${index}`} stage />
          ))}
          <div className="glance-tile-area flex min-h-0 min-w-0">
            <div className="glance-tiles @container min-h-0 min-w-0 flex-1">
              <div className="glance-strip">
                {Array.from({ length: GLANCE_VISIBLE_TILES }).map(
                  (_, index) => (
                    <SkeletonSlot key={`tile-${index}`} stage={false} />
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      ) : error ? (
        <p
          className="flex min-h-0 flex-1 items-center text-[length:calc(var(--glance-u)*2)] text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : groups.length === 0 ? (
        <p
          className="flex min-h-0 flex-1 items-center text-[length:calc(var(--glance-u)*2)] text-muted-foreground"
          role="status"
        >
          {emptyCopy}
        </p>
      ) : (
        <div
          data-slot="board-glance-grid"
          className="glance-grid min-h-0 flex-1"
          role="group"
          aria-label="Next trains"
        >
          {layout.anchors.map((group) => (
            <GlanceSlot
              key={`anchor-${group.key}`}
              group={group}
              stage
              room={room}
            />
          ))}
          <GlanceTileArea
            tiles={layout.tiles}
            room={room}
            interactive={interactive}
            onPin={handlePin}
          />
        </div>
      )}
    </div>
  )
}
