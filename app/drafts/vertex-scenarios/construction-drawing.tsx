import {
  blockLabel,
  blockMoves,
  type Construction,
} from "@/lib/tfl/investigate/vertex-scenarios/construction"
import type { PortId } from "@/lib/tfl/investigate/vertex-scenarios/types"
import { octilinearLanePath } from "@/lib/tfl/schematic-layout"
import {
  BlockBand,
  Bond,
  Ring,
  Tick,
  Track,
  type ActiveMove,
  type Pt,
} from "./paint"

const WIDTH = 520
const PITCH = 48
const LEFT = 56
const JOIN = 200
const RIGHT = 464
const GAP = 10

const branch = (a: Pt, b: Pt) => octilinearLanePath(a.x, a.y, b.x, b.y, 22)

export function ConstructionDrawing({
  construction,
  active,
  splitMarkers,
}: {
  construction: Construction
  active: ActiveMove
  splitMarkers: boolean
}) {
  const blocks = [
    ...construction.blocks,
    ...construction.termini.map((port) => ({
      left: [port],
      right: [] as PortId[],
      direction: "both" as const,
    })),
  ]
  const heights = blocks.map(
    (block) => Math.max(block.left.length, block.right.length, 1) * PITCH + 36
  )
  const rows = blocks.map((block, index) => ({
    block,
    index,
    height: heights[index]!,
    top: GAP + heights.slice(0, index).reduce((sum, height) => sum + height, 0),
  }))
  const totalHeight = GAP * 2 + heights.reduce((sum, height) => sum + height, 0)
  const markerX = splitMarkers ? 400 : 248
  const markers: Pt[] = []
  for (const { block, top, height } of rows) {
    const cy = top + height / 2
    if (splitMarkers && block.right.length) {
      block.right.forEach((_, i) =>
        markers.push({
          x: markerX,
          y: cy + (i - (block.right.length - 1) / 2) * PITCH,
        })
      )
    } else markers.push({ x: markerX, y: cy })
  }
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${totalHeight}`}
      role="img"
      aria-label={
        construction.blocks.length
          ? construction.blocks.map(blockLabel).join("; ")
          : "Termini at S"
      }
      className="mx-auto h-auto w-full max-w-xl overflow-visible"
    >
      {rows.map(({ block, top, height }) => (
        <BlockBand
          key={`band-${top}`}
          x={12}
          y={top}
          width={WIDTH - 24}
          height={height - GAP}
        />
      ))}
      {rows.map(({ block, top, height, index }) => {
        const cy = top + height / 2
        const moves = blockMoves(block)
        const blockOn =
          active != null &&
          moves.some((m) => m.from === active.from && m.to === active.to)
        const portOn = (port: PortId) =>
          Boolean(
            blockOn && active && (active.from === port || active.to === port)
          )
        const leftY = (i: number) =>
          cy + (i - (block.left.length - 1) / 2) * PITCH
        const rightY = (i: number) =>
          cy + (i - (block.right.length - 1) / 2) * PITCH
        const stemEnd = block.right.length ? JOIN + 80 : markerX
        return (
          <g key={index}>
            {block.left.map((port, i) => (
              <Track
                key={`L${port}`}
                d={`${branch({ x: LEFT, y: leftY(i) }, { x: JOIN, y: cy })} L ${stemEnd} ${cy}`}
                on={portOn(port)}
                active={active}
              />
            ))}
            {block.right.map((port, i) => (
              <Track
                key={`R${port}`}
                d={`${branch({ x: JOIN + 80, y: cy }, { x: RIGHT - 40, y: rightY(i) })} L ${RIGHT} ${rightY(i)}`}
                on={portOn(port)}
                active={active}
              />
            ))}
            {block.left.map((port, i) => (
              <Tick
                key={`Lt${port}`}
                x={LEFT}
                y={leftY(i)}
                axis="v"
                label={port}
                labelAt={{ x: LEFT - 20, y: leftY(i) }}
              />
            ))}
            {block.right.map((port, i) => (
              <Tick
                key={`Rt${port}`}
                x={RIGHT}
                y={rightY(i)}
                axis="v"
                label={port}
                labelAt={{ x: RIGHT + 20, y: rightY(i) }}
              />
            ))}
          </g>
        )
      })}
      {markers.length > 1 ? (
        <Bond a={markers[0]!} b={markers[markers.length - 1]!} />
      ) : null}
      {markers.map((point, i) => (
        <Ring key={i} x={point.x} y={point.y} />
      ))}
    </svg>
  )
}
