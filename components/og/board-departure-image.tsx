import type { CSSProperties } from "react"
import {
  TFL_BLUE,
  TFL_MODAL_COLOURS,
  UNDERGROUND_LINE_COLOURS,
  UNDERGROUND_RING_RED,
} from "@/lib/tfl/brand-colours"

const INK = "#171717"
const PAPER = "#FFFFFF"
const RULE = "#E5E5E5"
const CHIP = "#767676"
const FACE = "Hammersmith One"

const TILE = 90
const PAD_X = 28
const BAR = 8

const face = (size: number, color: string = INK): CSSProperties => ({
  display: "flex",
  fontFamily: FACE,
  fontSize: size,
  color,
  lineHeight: 1,
  fontSynthesis: "none",
})

const tile = (rule: "hairline" | "none" | string): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  boxSizing: "border-box",
  width: "100%",
  height: TILE,
  paddingLeft: PAD_X,
  paddingRight: PAD_X,
  overflow: "hidden",
  borderBottomStyle: "solid",
  borderBottomWidth: rule === "none" ? 0 : rule === "hairline" ? 1 : BAR,
  borderBottomColor: rule === "hairline" || rule === "none" ? RULE : rule,
})

const roundelSrc = (disc: string, bar: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 615.3 500"><circle cx="308.123" cy="249.985" r="250" fill="${disc}"/><rect x="0" y="199.5" width="615.3" height="101.1" rx="50.55" ry="50.55" fill="${bar}"/></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const Roundel = ({ disc, bar }: { disc: string; bar: string }) => (
  // The image renderer paints this SVG itself. next/image is not in that runtime.
  // eslint-disable-next-line @next/next/no-img-element
  <img
    alt=""
    src={roundelSrc(disc, bar)}
    width={78}
    height={64}
    style={{ width: 78, height: 64, marginRight: 16 }}
  />
)

const IdentityChip = ({
  label,
  background,
  width,
}: {
  label: string
  background: string
  width: number
}) => (
  <div
    style={{
      ...face(20, PAPER),
      width,
      height: 36,
      marginRight: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: background,
      flexShrink: 0,
    }}
  >
    {label}
  </div>
)

type Arrival = {
  destination: string
  when: string
  chip?: { label: string; background: string; width: number }
}

const ArrivalRow = ({
  row,
  rule,
}: {
  row: Arrival
  rule: "hairline" | "none"
}) => (
  <div style={tile(rule)}>
    {row.chip ? (
      <IdentityChip
        label={row.chip.label}
        background={row.chip.background}
        width={row.chip.width}
      />
    ) : null}
    <div style={{ ...face(30), flex: 1 }}>{row.destination}</div>
    <div style={{ ...face(30), marginLeft: 16, flexShrink: 0 }}>{row.when}</div>
  </div>
)

const LineHeader = ({ name, color }: { name: string; color: string }) => (
  <div style={tile(color)}>
    <div style={face(34, color)}>{name}</div>
  </div>
)

const StopTitle = ({
  name,
  disc,
  bar,
}: {
  name: string
  disc: string
  bar: string
}) => (
  <div style={tile("hairline")}>
    <Roundel disc={disc} bar={bar} />
    <div style={face(34)}>{name}</div>
  </div>
)

const platform = (label: string) => ({
  label,
  background: CHIP,
  width: 58,
})

const BoardColumn = ({
  title,
  disc,
  bar,
  sections,
}: {
  title: string
  disc: string
  bar: string
  sections: { name: string; color: string; rows: Arrival[] }[]
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      flex: 1,
      height: "100%",
      backgroundColor: PAPER,
    }}
  >
    <StopTitle name={title} disc={disc} bar={bar} />
    {sections.map((section) => (
      <div
        key={section.name}
        style={{ display: "flex", flexDirection: "column" }}
      >
        <LineHeader name={section.name} color={section.color} />
        {section.rows.map((row) => (
          <ArrivalRow
            key={`${section.name}-${row.destination}`}
            row={row}
            rule="hairline"
          />
        ))}
      </div>
    ))}
  </div>
)

/** Static Board card: rail and bus columns, same tile height as the arrivals board. */
export const BoardDepartureImage = () => {
  const victoria = UNDERGROUND_LINE_COLOURS.victoria.hex
  const piccadilly = UNDERGROUND_LINE_COLOURS.piccadilly.hex
  const buses = TFL_MODAL_COLOURS.buses.hex

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        backgroundColor: PAPER,
        color: INK,
        fontFamily: FACE,
      }}
    >
      <BoardColumn
        title="King's Cross St. Pancras"
        disc={UNDERGROUND_RING_RED}
        bar={TFL_BLUE}
        sections={[
          {
            name: "Victoria",
            color: victoria,
            rows: [
              {
                chip: platform("P4"),
                destination: "Walthamstow Central",
                when: "2 min",
              },
              {
                chip: platform("P5"),
                destination: "Brixton",
                when: "5 min",
              },
            ],
          },
          {
            name: "Piccadilly",
            color: piccadilly,
            rows: [
              {
                chip: platform("P6"),
                destination: "Cockfosters",
                when: "3 min",
              },
              {
                chip: platform("P1"),
                destination: "Heathrow Terminal 5",
                when: "7 min",
              },
            ],
          },
        ]}
      />
      <div style={{ width: 1, height: "100%", backgroundColor: RULE }} />
      <BoardColumn
        title="King's Cross Station"
        disc={buses}
        bar={buses}
        sections={[
          {
            name: "73",
            color: buses,
            rows: [
              { destination: "Oxford Circus", when: "1 min" },
              { destination: "Marble Arch", when: "4 min" },
            ],
          },
          {
            name: "390",
            color: buses,
            rows: [
              { destination: "Archway", when: "6 min" },
              { destination: "Euston", when: "8 min" },
            ],
          },
        ]}
      />
    </div>
  )
}
