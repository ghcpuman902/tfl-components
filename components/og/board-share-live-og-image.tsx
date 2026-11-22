import type { CSSProperties, ReactNode } from "react"
import {
  BoardShareOgImage,
  roundelSrc,
} from "@/components/og/board-share-og-image"
import { ogLineChipTextColor } from "@/lib/og/chip-text"
import type {
  BoardShareLiveOgModel,
  BoardShareOgBus,
  BoardShareOgCycle,
  BoardShareOgDockRow,
  BoardShareOgRailArrivals,
  BoardShareOgRailStatus,
} from "@/lib/og/board-share-live-og"
import { OG_STATUS_ROWS } from "@/lib/og/board-share-live-og-rows"
import type { BoardShareOgLine } from "@/lib/og/board-share-og"
import {
  TFL_BLUE,
  TFL_MODAL_COLOURS,
  UNDERGROUND_RING_RED,
} from "@/lib/tfl/brand-colours"

// Palette — Board ink, muted and rule.
const INK = "#171717"
const MUTED = "#6B6B6B"
const RULE = "#E5E5E5"
const PAPER = "#FFFFFF"
const BIKE = "#FB2C36"
const EBIKE = "#0092B8"
const FACE = "Hammersmith One"

// Canvas: 1200×630, Board rows scaled up.
const CANVAS_W = 1200
const PAD_TOP = 44
const PAD_X = 56
const CONTENT_W = CANVAS_W - PAD_X * 2
const FOOT_BOTTOM = 22
const FOOT_SIZE = 24

// Header: roundel + station name, then the heavy-ruled subtitle.
const ROUNDEL_W = 88
const ROUNDEL_H = Math.round((ROUNDEL_W * 500) / 615.3)
const ROUNDEL_GAP = 28
const TITLE_SIZE = 68
const SUB_SIZE = 38
const SUB_GAP = 16
const SUB_PAD = 12
const SUB_RULE = 6
const ROW_RULE = 2

// A: bound heading + arrival rows + "Also here".
const DIR_SIZE = 30
const DIR_H = 54
const ROW_H = 72
const DEST_SIZE = 44
const TIME_SIZE = 52
const ALSO_GAP = 18
const ALSO_LABEL = 28
const ALSO_CHIP_H = 48
const ALSO_CHIP_PAD = 20
const CHIP_GAP = 14

// B: status rows.
const STATUS_H = 58
const STATUS_CHIP_W = 300
const STATUS_CHIP_H = 48
const STATUS_CHIP_SIZE = 32
const STATUS_CHIP_GAP = 36
const STATUS_SIZE = 38
const NEXT_H = 60
const NEXT_SIZE = 34

// C: bus rows.
const KICKER_SIZE = 30
const KICKER_GAP = 8
const BUS_TITLE_SIZE = 66
const BUS_SUB_GAP = 20
const BUS_ROW_H = 78
const BUS_CHIP_W = 150
const BUS_CHIP_H = 62
const BUS_CHIP_SIZE = 40
const BUS_CHIP_GAP = 34
const BUS_DEST_SIZE = 46
const BUS_TIME_SIZE = 54
const NOTE_H = 50
const NOTE_SIZE = 28

/** Hammersmith One averages ~0.52em per glyph; good enough to fit one line. */
const GLYPH_EM = 0.52

const face = (size: number, color: string = INK): CSSProperties => ({
  display: "flex",
  fontFamily: FACE,
  fontSize: size,
  color,
  lineHeight: 1,
  fontSynthesis: "none",
})

const oneLine: CSSProperties = {
  overflow: "hidden",
  whiteSpace: "nowrap",
}

/** Largest size up to `max` that keeps `text` on one line in `width`. */
const fitSize = (text: string, max: number, width: number): number =>
  Math.max(
    Math.round(max * 0.6),
    Math.min(max, Math.floor(width / (Math.max(1, text.length) * GLYPH_EM)))
  )

/** PMS 485 — tfl-ts `getLineColor("buses")` is slate, not brand red. */
const BUS_RED = TFL_MODAL_COLOURS.buses.hex

const minutesText = (minutes: number): string =>
  minutes === 0 ? "Due" : `${minutes} min`

/**
 * Square LineBadge chip: line colour fill, `--line-ink` text, no radius.
 * Fixed-width chips ellipsis long labels (Hammersmith & City) via CSS that
 * Takumi's Blink-ported text layout paints — not a guessed glyph width.
 */
const Chip = ({
  lineId,
  label,
  color,
  size,
  height,
  width,
  padX,
  marginRight = CHIP_GAP,
}: {
  lineId: string
  label: string
  color: string
  size: number
  height: number
  width?: number
  padX?: number
  marginRight?: number
}) => (
  <div
    style={{
      display: "flex",
      boxSizing: "border-box",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      height,
      width,
      maxWidth: width,
      paddingLeft: padX,
      paddingRight: padX,
      marginRight,
      backgroundColor: color,
      borderRadius: 0,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        ...face(size, ogLineChipTextColor(lineId)),
        ...oneLine,
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: "100%",
      }}
    >
      {label}
    </div>
  </div>
)

/** Column wrapper (Takumi lays out real nodes; no fragments). */
const Stack = ({ children }: { children: ReactNode }) => (
  <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>
)

const Rule = ({
  height,
  children,
  last = false,
}: {
  height: number
  children: ReactNode
  last?: boolean
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      height,
      borderBottom: last ? "none" : `${ROW_RULE}px solid ${RULE}`,
    }}
  >
    {children}
  </div>
)

const StationHeader = ({ name }: { name: string }) => (
  <div style={{ display: "flex", alignItems: "center" }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      alt=""
      src={roundelSrc(UNDERGROUND_RING_RED, TFL_BLUE)}
      width={ROUNDEL_W}
      height={ROUNDEL_H}
      style={{
        width: ROUNDEL_W,
        height: ROUNDEL_H,
        marginRight: ROUNDEL_GAP,
        flexShrink: 0,
      }}
    />
    <div
      style={{
        ...face(
          fitSize(name, TITLE_SIZE, CONTENT_W - ROUNDEL_W - ROUNDEL_GAP)
        ),
        ...oneLine,
        flex: 1,
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {name}
    </div>
  </div>
)

const Subtitle = ({
  children,
  marginTop = SUB_GAP,
}: {
  children: ReactNode
  marginTop?: number
}) => (
  <div
    style={{
      ...face(SUB_SIZE),
      ...oneLine,
      marginTop,
      paddingBottom: SUB_PAD,
      borderBottom: `${SUB_RULE}px solid ${INK}`,
      overflow: "hidden",
      textOverflow: "ellipsis",
    }}
  >
    {children}
  </div>
)

/** A: primary line as a square colour badge under the station, then the heavy rule. */
const LineBadgeSubtitle = ({ line }: { line: BoardShareOgLine }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      marginTop: SUB_GAP,
      paddingBottom: SUB_PAD,
      borderBottom: `${SUB_RULE}px solid ${INK}`,
    }}
  >
    <Chip
      lineId={line.id}
      label={line.name}
      color={line.color}
      size={SUB_SIZE - 4}
      height={ALSO_CHIP_H}
      padX={ALSO_CHIP_PAD}
      marginRight={0}
    />
  </div>
)

/** Heavy rule only — B/C drop their old text headings. */
const HeaderRule = ({ marginTop = SUB_GAP }: { marginTop?: number }) => (
  <div
    style={{
      marginTop,
      borderBottom: `${SUB_RULE}px solid ${INK}`,
      height: 0,
      flexShrink: 0,
    }}
  />
)

const TimeRow = ({
  destination,
  minutes,
  height,
  destSize,
  timeSize,
  lead,
}: {
  destination: string
  minutes: number
  height: number
  destSize: number
  timeSize: number
  lead?: ReactNode
}) => (
  <Rule height={height}>
    {lead}
    <div
      style={{
        ...face(destSize),
        ...oneLine,
        flex: 1,
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {destination}
    </div>
    <div style={{ ...face(timeSize), flexShrink: 0, marginLeft: CHIP_GAP }}>
      {minutesText(minutes)}
    </div>
  </Rule>
)

/** Chips that fit beside the label on one line, in order. */
const fitChips = (
  lines: readonly BoardShareOgLine[],
  width: number
): BoardShareOgLine[] => {
  const out: BoardShareOgLine[] = []
  let used = 0
  for (const line of lines) {
    const w =
      line.name.length * ALSO_LABEL * GLYPH_EM + ALSO_CHIP_PAD * 2 + CHIP_GAP
    if (used + w > width) break
    out.push(line)
    used += w
  }
  return out
}

const RailArrivals = ({
  stationName,
  live,
}: {
  stationName: string
  live: BoardShareOgRailArrivals
}) => {
  const labelW = "Also here".length * ALSO_LABEL * GLYPH_EM + CHIP_GAP
  const also = fitChips(live.alsoHere, CONTENT_W - labelW)
  return (
    <Stack>
      <StationHeader name={stationName} />
      <LineBadgeSubtitle line={live.line} />
      {live.direction ? (
        <Rule height={DIR_H}>
          <div style={face(DIR_SIZE, MUTED)}>{live.direction}</div>
        </Rule>
      ) : null}
      {live.rows.map((row, i) => (
        <TimeRow
          key={`${row.destination}-${i}`}
          destination={row.destination}
          minutes={row.minutes}
          height={ROW_H}
          destSize={DEST_SIZE}
          timeSize={TIME_SIZE}
        />
      ))}
      {also.length > 0 ? (
        <div
          style={{ display: "flex", alignItems: "center", marginTop: ALSO_GAP }}
        >
          <div style={{ ...face(ALSO_LABEL, MUTED), marginRight: CHIP_GAP }}>
            Also here
          </div>
          {also.map((line) => (
            <Chip
              key={line.id}
              lineId={line.id}
              label={line.name}
              color={line.color}
              size={ALSO_LABEL}
              height={ALSO_CHIP_H}
              padX={ALSO_CHIP_PAD}
            />
          ))}
        </div>
      ) : null}
    </Stack>
  )
}

const RailStatus = ({
  stationName,
  live,
}: {
  stationName: string
  live: BoardShareOgRailStatus
}) => {
  const rows = live.rows.slice(
    0,
    live.next ? OG_STATUS_ROWS - 1 : OG_STATUS_ROWS
  )
  return (
    <Stack>
      <StationHeader name={stationName} />
      <HeaderRule />
      {rows.map((row, i) => (
        <Rule
          key={row.id}
          height={STATUS_H}
          last={!live.next && i === rows.length - 1}
        >
          <Chip
            lineId={row.id}
            label={row.name}
            color={row.color}
            size={STATUS_CHIP_SIZE}
            height={STATUS_CHIP_H}
            width={STATUS_CHIP_W}
            marginRight={STATUS_CHIP_GAP}
          />
          <div
            style={{
              ...face(STATUS_SIZE, row.tone === "ok" ? MUTED : INK),
              ...oneLine,
              flex: 1,
            }}
          >
            {row.statusText}
          </div>
        </Rule>
      ))}
      {live.next ? (
        <Rule height={NEXT_H} last>
          <Chip
            lineId={live.next.line.id}
            label={live.next.line.name}
            color={live.next.line.color}
            size={STATUS_CHIP_SIZE}
            height={STATUS_CHIP_H}
            width={STATUS_CHIP_W}
            marginRight={STATUS_CHIP_GAP}
          />
          <div style={{ ...face(NEXT_SIZE), ...oneLine, flex: 1 }}>
            {`Next: ${live.next.destination} ${
              live.next.minutes === 0 ? "due" : `in ${live.next.minutes} min`
            }`}
          </div>
        </Rule>
      ) : null}
    </Stack>
  )
}

const Bus = ({ live }: { live: BoardShareOgBus }) => (
  <Stack>
    <div style={face(KICKER_SIZE, MUTED)}>Buses at</div>
    <div
      style={{
        ...face(fitSize(live.title, BUS_TITLE_SIZE, CONTENT_W)),
        ...oneLine,
        marginTop: KICKER_GAP,
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {live.title}
    </div>
    <HeaderRule marginTop={BUS_SUB_GAP} />
    {live.rows.map((row, i) => (
      <TimeRow
        key={`${row.route}-${i}`}
        destination={row.destination}
        minutes={row.minutes}
        height={BUS_ROW_H}
        destSize={BUS_DEST_SIZE}
        timeSize={BUS_TIME_SIZE}
        lead={
          <Chip
            lineId="buses"
            label={row.route}
            color={BUS_RED}
            size={BUS_CHIP_SIZE}
            height={BUS_CHIP_H}
            width={BUS_CHIP_W}
            marginRight={BUS_CHIP_GAP}
          />
        }
      />
    ))}
    <Rule height={NOTE_H} last>
      <div style={face(NOTE_SIZE, MUTED)}>
        Times are a snapshot; the link opens them live
      </div>
    </Rule>
  </Stack>
)

const ringSrc = (row: BoardShareOgDockRow): string => {
  const r = 20
  const c = 2 * Math.PI * r
  const total = Math.max(1, row.total)
  const bikes = (row.bikes / total) * c
  const eBikes = (row.eBikes / total) * c
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><circle cx="26" cy="26" r="${r}" fill="none" stroke="#D4D4D4" stroke-width="6"/><circle cx="26" cy="26" r="${r}" fill="none" stroke="${BIKE}" stroke-width="6" stroke-dasharray="${bikes} ${c}" transform="rotate(-90 26 26)"/><circle cx="26" cy="26" r="${r}" fill="none" stroke="${EBIKE}" stroke-width="6" stroke-dasharray="${eBikes} ${c}" stroke-dashoffset="${-bikes}" transform="rotate(-90 26 26)"/></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const Count = ({
  value,
  unit,
  color,
  width,
}: {
  value: number
  unit: string
  color: string
  width: number
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "baseline",
      justifyContent: "flex-end",
      width,
    }}
  >
    <div style={face(TIME_SIZE - 8, color)}>{value}</div>
    <div style={{ ...face(20, MUTED), marginLeft: 8 }}>{unit}</div>
  </div>
)

const DockRow = ({ row }: { row: BoardShareOgDockRow }) => (
  <Rule height={BUS_ROW_H}>
    <div
      style={{
        display: "flex",
        position: "relative",
        width: 52,
        height: 52,
        marginRight: 24,
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        src={ringSrc(row)}
        width={52}
        height={52}
        style={{ width: 52, height: 52 }}
      />
      <div
        style={{
          ...face(18),
          position: "absolute",
          inset: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {row.bikes + row.eBikes}
      </div>
    </div>
    <div style={{ ...face(34), ...oneLine, flex: 1 }}>{row.name}</div>
    <Count value={row.bikes} unit="bikes" color={BIKE} width={150} />
    <Count value={row.eBikes} unit="e-bikes" color={EBIKE} width={190} />
    <Count value={row.spaces} unit="spaces" color={MUTED} width={190} />
  </Rule>
)

const Cycle = ({
  stationName,
  live,
  thenLines,
}: {
  stationName: string
  live: BoardShareOgCycle
  thenLines: readonly BoardShareOgLine[]
}) => {
  const labelW = "Then trains".length * ALSO_LABEL * GLYPH_EM + CHIP_GAP
  const lines = fitChips(thenLines, CONTENT_W - labelW)
  return (
    <Stack>
      <div style={face(KICKER_SIZE, MUTED)}>Bikes near</div>
      <div
        style={{
          ...face(fitSize(stationName, BUS_TITLE_SIZE, CONTENT_W)),
          ...oneLine,
          marginTop: KICKER_GAP,
        }}
      >
        {stationName}
      </div>
      <Subtitle marginTop={BUS_SUB_GAP}>Docks</Subtitle>
      {live.rows.map((row) => (
        <DockRow key={row.name} row={row} />
      ))}
      {lines.length > 0 ? (
        <div
          style={{ display: "flex", alignItems: "center", marginTop: ALSO_GAP }}
        >
          <div style={{ ...face(ALSO_LABEL, MUTED), marginRight: CHIP_GAP }}>
            Then trains
          </div>
          {lines.map((line) => (
            <Chip
              key={line.id}
              lineId={line.id}
              label={line.name}
              color={line.color}
              size={ALSO_LABEL}
              height={ALSO_CHIP_H}
              padX={ALSO_CHIP_PAD}
            />
          ))}
        </div>
      ) : null}
    </Stack>
  )
}

/** 1200×630 share card for `/b/<slug>`: the Board's first panel, live. */
export const BoardShareLiveOgImage = ({
  model,
  host,
}: {
  model: BoardShareLiveOgModel
  /** Deploy host for the footer, e.g. `tfl.manglekuo.com`. */
  host: string
}) => {
  const { live } = model
  if (!live) return <BoardShareOgImage model={model} />
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: PAPER,
        paddingTop: PAD_TOP,
        paddingLeft: PAD_X,
        paddingRight: PAD_X,
        paddingBottom: FOOT_BOTTOM,
        fontFamily: FACE,
        color: INK,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        {live.kind === "rail-arrivals" ? (
          <RailArrivals stationName={model.stationName} live={live} />
        ) : live.kind === "rail-status" ? (
          <RailStatus stationName={model.stationName} live={live} />
        ) : live.kind === "bus" ? (
          <Bus live={live} />
        ) : (
          <Cycle
            stationName={model.stationName}
            live={live}
            thenLines={model.thenLines}
          />
        )}
      </div>
      <div style={{ display: "flex", flex: 1 }} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div style={face(FOOT_SIZE, MUTED)}>
          {model.at ? `live board · ${model.at}` : "live board"}
        </div>
        <div style={face(FOOT_SIZE, MUTED)}>{host}</div>
      </div>
    </div>
  )
}
