import type { CSSProperties } from "react"
import { BoardShareOgImage } from "@/components/og/board-share-og-image"
import { ogChipTextColor } from "@/lib/og/chip-text"
import type {
  BoardShareLiveOgModel,
  BoardShareOgArrivalRow,
  BoardShareOgDockRow,
} from "@/lib/og/board-share-live-og"
import type { BoardShareOgLine } from "@/lib/og/board-share-og"
import { getLineColor } from "tfl-ts/ui"

const INK = "#171717"
const MUTED = "#6B6B6B"
const RULE = "#E5E5E5"
const BIKE = "#FB2C36"
const EBIKE = "#0092B8"
const FACE = "Hammersmith One"
const PAD_X = 52

const face = (size: number, color: string = INK): CSSProperties => ({
  display: "flex",
  fontFamily: FACE,
  fontSize: size,
  color,
  lineHeight: 1,
  fontSynthesis: "none",
})

const ringSrc = (row: BoardShareOgDockRow): string => {
  const r = 20
  const c = 2 * Math.PI * r
  const total = Math.max(1, row.total)
  const bikes = (row.bikes / total) * c
  const eBikes = (row.eBikes / total) * c
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><circle cx="26" cy="26" r="${r}" fill="none" stroke="#D4D4D4" stroke-width="6"/><circle cx="26" cy="26" r="${r}" fill="none" stroke="${BIKE}" stroke-width="6" stroke-dasharray="${bikes} ${c}" transform="rotate(-90 26 26)"/><circle cx="26" cy="26" r="${r}" fill="none" stroke="${EBIKE}" stroke-width="6" stroke-dasharray="${eBikes} ${c}" stroke-dashoffset="${-bikes}" transform="rotate(-90 26 26)"/></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const Chip = ({
  id,
  name,
  color,
  size = 22,
}: {
  id: string
  name: string
  color: string
  size?: number
}) => (
  <div
    key={id}
    style={{
      ...face(size, ogChipTextColor(color)),
      alignItems: "center",
      paddingLeft: 10,
      paddingRight: 10,
      height: size + 14,
      backgroundColor: color,
      borderRadius: 4,
      marginRight: 10,
      flexShrink: 0,
    }}
  >
    {name}
  </div>
)

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
    <div style={face(44, color)}>{value}</div>
    <div style={{ ...face(20, MUTED), marginLeft: 8 }}>{unit}</div>
  </div>
)

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  height: 78,
  borderBottom: `2px solid ${RULE}`,
}

const DockRow = ({ row }: { row: BoardShareOgDockRow }) => (
  <div style={rowStyle}>
    <div
      style={{
        display: "flex",
        position: "relative",
        width: 52,
        height: 52,
        marginRight: 24,
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
    <div
      style={{ ...face(34), flex: 1, overflow: "hidden", whiteSpace: "nowrap" }}
    >
      {row.name}
    </div>
    <Count value={row.bikes} unit="bikes" color={BIKE} width={150} />
    <Count value={row.eBikes} unit="e-bikes" color={EBIKE} width={190} />
    <Count value={row.spaces} unit="spaces" color={MUTED} width={190} />
  </div>
)

const lineColor = (id: string): string => {
  try {
    return getLineColor(id).hex
  } catch {
    return "#DC241F"
  }
}

const ArrivalRow = ({
  row,
  bus,
}: {
  row: BoardShareOgArrivalRow
  bus: boolean
}) => (
  <div style={rowStyle}>
    <div style={{ display: "flex", width: 230 }}>
      <Chip
        id={row.lineId}
        name={row.lineName}
        color={bus ? "#DC241F" : lineColor(row.lineId)}
        size={24}
      />
    </div>
    <div
      style={{ ...face(34), flex: 1, overflow: "hidden", whiteSpace: "nowrap" }}
    >
      {row.destination}
    </div>
    <div style={face(40)}>
      {row.minutes === 0 ? "Due" : `${row.minutes} min`}
    </div>
  </div>
)

const HEADINGS = {
  cycle: "Bikes near",
  rail: "Trains at",
  bus: "Buses at",
} as const

/** 1200x630 share card for `/b/<slug>`: the first panel, live. */
export const BoardShareLiveOgImage = ({
  model,
  shortUrl,
}: {
  model: BoardShareLiveOgModel
  shortUrl: string
}) => {
  const { live } = model
  if (!live) return <BoardShareOgImage model={model} />
  const restLines: BoardShareOgLine[] =
    live.kind === "cycle" ? model.thenLines.slice(0, 7) : []
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: "#FFFFFF",
        paddingLeft: PAD_X,
        paddingRight: PAD_X,
        paddingTop: 46,
        paddingBottom: 40,
        fontFamily: FACE,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={face(28, MUTED)}>{HEADINGS[live.kind]}</div>
        {model.at ? (
          <div style={face(24, MUTED)}>{`Live at ${model.at}`}</div>
        ) : null}
      </div>
      <div
        style={{
          ...face(60),
          marginTop: 10,
          paddingBottom: 20,
          borderBottom: `5px solid ${INK}`,
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        {model.stationName}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {live.kind === "cycle"
          ? live.rows.map((row) => <DockRow key={row.name} row={row} />)
          : live.rows.map((row, i) => (
              <ArrivalRow
                key={`${row.lineId}-${i}`}
                row={row}
                bus={live.kind === "bus"}
              />
            ))}
      </div>
      {restLines.length > 0 ? (
        <div style={{ display: "flex", alignItems: "center", marginTop: 20 }}>
          <div style={{ ...face(22, MUTED), marginRight: 14 }}>
            then trains:
          </div>
          {restLines.map((line) => (
            <Chip
              key={line.id}
              id={line.id}
              name={line.name}
              color={line.color}
              size={20}
            />
          ))}
        </div>
      ) : null}
      <div style={{ display: "flex", flex: 1 }} />
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <div style={{ ...face(30), WebkitTextStroke: `1px ${INK}` }}>Board</div>
        <div
          style={{ ...face(30, MUTED), marginLeft: 10 }}
        >{`· ${shortUrl}`}</div>
      </div>
    </div>
  )
}
