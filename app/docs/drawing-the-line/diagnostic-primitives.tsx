/**
 * Presentational-only pieces for the "Drawing the line" investigation.
 * Brand colour follows `data-line` → `--line-color`. No octilinear layout.
 */
import { formatStationName } from "@/lib/tfl/diagram-station"
import { lineCssPaint } from "@/lib/tfl/line-colour-map"
import {
  DIAGRAM_BASELINE,
  HORIZONTAL_NAME_SIZE_UNITS,
  LINE_DIAGRAM,
  horizontalStationFontSize,
  interchangeOuterRadius,
  interchangeStroke,
  scale,
} from "@/lib/tfl/line-diagram"
import { isMovementSplit, stubAttachDirection } from "@/lib/tfl/investigate/corridors"
import {
  compassOctant,
  crossingMinOrderIds,
  displayBearingsById,
} from "@/lib/tfl/investigate/orientation"
import type {
  JunctionReport,
  NeighbourRef,
  ThroughCorridor,
} from "@/lib/tfl/investigate/types"

type Pt = { x: number; y: number }

const unit = (dx: number, dy: number): Pt => {
  const length = Math.hypot(dx, dy) || 1
  return { x: dx / length, y: dy / length }
}

const polarPoint = (index: number, count: number, radius: number, cx: number, cy: number): Pt => {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
}

/** Screen point for a compass bearing (0 = north, clockwise). */
const pointFromBearing = (bearingDeg: number, radius: number, cx: number, cy: number): Pt => {
  const rad = (bearingDeg * Math.PI) / 180
  return { x: cx + radius * Math.sin(rad), y: cy - radius * Math.cos(rad) }
}

const shortName = (name: string) => formatStationName(name)

const neighbourRole = (neighbour: NeighbourRef): string =>
  neighbour.degree === 1
    ? "terminal"
    : neighbour.degree === 2 && neighbour.beyond
      ? `onwards to ${shortName(neighbour.beyond.name)}`
      : `junction, deg ${neighbour.degree}`

const neighbourCaption = (neighbour: NeighbourRef): string => {
  const compass = neighbour.bearingDeg != null ? compassOctant(neighbour.bearingDeg) : null
  const role = neighbourRole(neighbour)
  return compass ? `${compass} · ${role}` : role
}

/** Fallback only — when a junction has no coordinates. */
const bestNeighbourOrder = (
  neighbours: readonly NeighbourRef[],
  pairs: readonly [string, string][]
): NeighbourRef[] => {
  const byId = new Map(neighbours.map((neighbour) => [neighbour.id, neighbour]))
  return crossingMinOrderIds(
    neighbours.map((neighbour) => neighbour.id),
    pairs
  ).map((id) => byId.get(id)!)
}

const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y })
const scalePt = (p: Pt, s: number): Pt => ({ x: p.x * s, y: p.y * s })
const dot = (a: Pt, b: Pt): number => a.x * b.x + a.y * b.y

/** Normal of `outward` that points toward `toward`. */
const inwardNormal = (outward: Pt, toward: Pt): Pt => {
  const clockwise = { x: -outward.y, y: outward.x }
  return dot(clockwise, toward) > 0 ? clockwise : { x: -clockwise.x, y: -clockwise.y }
}

const pathD = (p0: Pt, p1: Pt, p2: Pt, p3: Pt): string =>
  `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} ${p3.x.toFixed(1)} ${p3.y.toFixed(1)}`

/** Near-180° wrap around the ring — diagnosis draws the through-move the production engine omits. */
const trackOppositeBezier = (
  fromTick: Pt,
  toTick: Pt,
  centre: Pt,
  offset: number,
  near: number,
  far: number,
  side: 1 | -1
): string | null => {
  if (far <= near + 4) return null
  const ua = unit(fromTick.x - centre.x, fromTick.y - centre.y)
  const ub = unit(toTick.x - centre.x, toTick.y - centre.y)
  const n = { x: -ua.y * side, y: ua.x * side }
  const p0 = add(add(centre, scalePt(ua, far)), scalePt(n, offset))
  const p3 = add(add(centre, scalePt(ub, far)), scalePt(n, offset))
  const handle = far - near
  const p1 = add(p0, scalePt(ua, -handle))
  const p2 = add(p3, scalePt(ub, -handle))
  return pathD(p0, p1, p2, p3)
}

/** Tight same-direction pair: a short outward arc between the two ticks. */
const trackTightBezier = (
  fromTick: Pt,
  toTick: Pt,
  centre: Pt,
  offset: number,
  far: number
): string | null => {
  const ua = unit(fromTick.x - centre.x, fromTick.y - centre.y)
  const ub = unit(toTick.x - centre.x, toTick.y - centre.y)
  const mid = unit(ua.x + ub.x, ua.y + ub.y)
  if (!Number.isFinite(mid.x)) return null
  const p0 = add(centre, scalePt(ua, far))
  const p3 = add(centre, scalePt(ub, far))
  const bulge = add(centre, scalePt(mid, far + offset * 2.2))
  const p1 = add(p0, scalePt(unit(bulge.x - p0.x, bulge.y - p0.y), offset))
  const p2 = add(p3, scalePt(unit(bulge.x - p3.x, bulge.y - p3.y), offset))
  return pathD(p0, p1, p2, p3)
}

/**
 * Turn indicator for diagnosis: mid-angle cubics, a wrap for ~180°
 * through-moves, and a tight outward arc for same-direction neighbours.
 * Production strips still drop the 180° case — the coloured arm is enough there.
 */
const trackPairPaths = (
  fromTick: Pt,
  toTick: Pt,
  centre: Pt,
  offset: number,
  near: number,
  far: number
): string[] => {
  if (far <= near + 4) return []
  const ua = unit(fromTick.x - centre.x, fromTick.y - centre.y)
  const ub = unit(toTick.x - centre.x, toTick.y - centre.y)
  const turn = Math.acos(Math.min(1, Math.max(-1, dot(ua, ub))))
  if (turn < 0.35) {
    const tight = trackTightBezier(fromTick, toTick, centre, offset, far)
    return tight ? [tight] : []
  }
  if (turn > (Math.PI * 5) / 6) {
    return [1, -1]
      .map((side) =>
        trackOppositeBezier(fromTick, toTick, centre, offset, near, far, side as 1 | -1)
      )
      .filter((d): d is string => d != null)
  }
  const nA = inwardNormal(ua, ub)
  const nB = inwardNormal(ub, ua)
  const p0 = add(add(centre, scalePt(ua, far)), scalePt(nA, offset))
  const p3 = add(add(centre, scalePt(ub, far)), scalePt(nB, offset))
  const handle = far - near
  const p1 = add(p0, scalePt(ua, -handle))
  const p2 = add(p3, scalePt(ub, -handle))
  return [pathD(p0, p1, p2, p3)]
}

type LabelPlacement = { anchor: "start" | "end" | "middle" }

/**
 * Tube-map label side: names sit above a horizontal arm, to the right of
 * a vertical arm — never on the stroke.
 */
const labelSide = (outward: Pt): Pt =>
  Math.abs(outward.x) > Math.abs(outward.y) ? { x: 0, y: -1 } : { x: 1, y: 0 }

const labelAnchor = (outward: Pt, side: Pt): "start" | "end" | "middle" => {
  if (side.x > 0.3) return "start"
  if (side.x < -0.3) return "end"
  if (Math.abs(outward.x) > 0.35) return outward.x > 0 ? "start" : "end"
  return "middle"
}

const clampLabelX = (x: number, anchor: "start" | "end" | "middle", size: number) => {
  const pad = 6
  if (anchor === "end") return Math.min(x, size - pad)
  if (anchor === "start") return Math.max(x, pad)
  return Math.min(size - pad, Math.max(pad, x))
}

const clampLabelY = (y: number, fontSize: number, size: number) =>
  Math.min(size - 4, Math.max(fontSize, y))

/**
 * Two (or more) independent through-runs that share a station name.
 * Each corridor is a straight degree-2 stroke; rings sit on a shared
 * interchange bar. Cross-corridor pairs are not drawn as track — they
 * are not through-moves.
 */
const IndependentCorridorsSvg = ({
  lineId,
  junction,
  corridors,
}: {
  lineId: string
  junction: JunctionReport
  corridors: readonly ThroughCorridor[]
}) => {
  const x = DIAGRAM_BASELINE.horizontal
  const size = 460
  const centre: Pt = { x: size / 2, y: size / 2 }
  const armRadius = scale(x, 11)
  const minArmRadius = scale(x, 7.5)
  const onwardLength = scale(x, 4)
  const ringOuter = interchangeOuterRadius(x)
  const ringStroke = interchangeStroke(x)
  const tickProtrude = scale(x, LINE_DIAGRAM.stationTick)
  const tickAlong = x
  const tickAcross = x + tickProtrude * 2
  const nameSize = horizontalStationFontSize(x)
  const captionSize = scale(x, HORIZONTAL_NAME_SIZE_UNITS * 0.55)
  const nameClearance = scale(x, LINE_DIAGRAM.layout.nameBelowLine) + x / 2
  const paint = lineCssPaint(lineId)
  const stubs = junction.stubs
  const pieceCount = corridors.length + stubs.length
  const laneGap = Math.max(2 * ringOuter + scale(x, 1.5), scale(x, 6))
  const totalWidth = Math.max(0, pieceCount - 1) * laneGap
  const leftX = centre.x - totalWidth / 2

  const knownDistances = [
    ...corridors.flatMap((corridor) => [corridor.a.distanceM, corridor.b.distanceM]),
    ...stubs.map((stub) => stub.distanceM),
  ].filter((value): value is number => value != null)
  const dMin = knownDistances.length > 0 ? Math.min(...knownDistances) : 0
  const dMax = knownDistances.length > 0 ? Math.max(...knownDistances) : 0
  const radiusOf = (neighbour: NeighbourRef): number => {
    if (neighbour.distanceM == null || dMax <= dMin) return armRadius
    const t = (neighbour.distanceM - dMin) / (dMax - dMin)
    return minArmRadius + (armRadius - minArmRadius) * t
  }

  const place = (neighbour: NeighbourRef, laneX: number, direction: -1 | 1, side: Pt) => {
    const radius = radiusOf(neighbour)
    const point: Pt = { x: laneX, y: centre.y + direction * radius }
    const lineEnd: Pt =
      neighbour.degree === 2
        ? { x: point.x, y: point.y + direction * onwardLength }
        : point
    const nameAt: Pt = { x: point.x + side.x * nameClearance, y: point.y }
    const captionAt: Pt = {
      x: lineEnd.x + side.x * nameClearance,
      y: lineEnd.y + direction * captionSize,
    }
    return { neighbour, point, lineEnd, nameAt, captionAt }
  }

  const lanes = [
    ...corridors.map((corridor, index) => {
      const laneX = leftX + index * laneGap
      const labelsLeft = index === 0 && pieceCount > 1
      const side: Pt = labelsLeft ? { x: -1, y: 0 } : { x: 1, y: 0 }
      const top = place(corridor.a, laneX, -1, side)
      const bottom = place(corridor.b, laneX, 1, side)
      return {
        id: `through-${corridor.a.id}-${corridor.b.id}`,
        ring: { x: laneX, y: centre.y },
        ends: [top, bottom],
        strokeFrom: top.lineEnd,
        strokeTo: bottom.lineEnd,
        anchor: (labelsLeft ? "end" : "start") as "start" | "end",
      }
    }),
    ...stubs.map((stub, stubIndex) => {
      const index = corridors.length + stubIndex
      const laneX = leftX + index * laneGap
      const labelsLeft = index === 0 && pieceCount > 1
      const side: Pt = labelsLeft ? { x: -1, y: 0 } : { x: 1, y: 0 }
      const direction = stubAttachDirection(stub, corridors)
      const end = place(stub, laneX, direction, side)
      const ring = { x: laneX, y: centre.y }
      return {
        id: `stub-${stub.id}`,
        ring,
        ends: [end],
        strokeFrom: ring,
        strokeTo: end.lineEnd,
        anchor: (labelsLeft ? "end" : "start") as "start" | "end",
      }
    }),
  ]

  return (
    <div>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Movement split at ${junction.station.name}`}
        data-line={lineId}
        data-tfl-diagram={lineId === "cable-car" ? "" : undefined}
        className="h-auto w-full overflow-visible"
      >
        <text
          x={centre.x}
          y={14}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize={captionSize}
        >
          N
        </text>

        {lanes.length > 1 ? (
          <line
            x1={lanes[0]!.ring.x}
            y1={lanes[0]!.ring.y}
            x2={lanes[lanes.length - 1]!.ring.x}
            y2={lanes[lanes.length - 1]!.ring.y}
            stroke="var(--foreground)"
            strokeWidth={ringStroke}
          >
            <title>Interchange — not a through-run</title>
          </line>
        ) : null}

        {lanes.map((lane) => (
          <line
            key={`stroke-${lane.id}`}
            x1={lane.strokeFrom.x}
            y1={lane.strokeFrom.y}
            x2={lane.strokeTo.x}
            y2={lane.strokeTo.y}
            stroke={paint}
            strokeWidth={x}
            strokeLinecap="butt"
          />
        ))}

        {lanes.flatMap((lane) =>
          lane.ends.map((end) => (
            <rect
              key={`tick-${end.neighbour.id}`}
              x={end.point.x - tickAcross / 2}
              y={end.point.y - tickAlong / 2}
              width={tickAcross}
              height={tickAlong}
              fill={paint}
            />
          ))
        )}

        {lanes.map((lane) => (
          <circle
            key={`ring-${lane.id}`}
            cx={lane.ring.x}
            cy={lane.ring.y}
            r={ringOuter - ringStroke / 2}
            fill="var(--background)"
            stroke="var(--foreground)"
            strokeWidth={ringStroke}
          />
        ))}

        {lanes.flatMap((lane) =>
          lane.ends.map((end) => {
            const nameX = clampLabelX(end.nameAt.x, lane.anchor, size)
            const captionX = clampLabelX(end.captionAt.x, lane.anchor, size)
            return (
              <g key={`label-${end.neighbour.id}`}>
                <text
                  x={nameX}
                  y={clampLabelY(end.nameAt.y, nameSize, size)}
                  textAnchor={lane.anchor}
                  className="fill-foreground font-medium"
                  fontSize={nameSize}
                >
                  {shortName(end.neighbour.name)}
                </text>
                <text
                  x={captionX}
                  y={clampLabelY(end.captionAt.y, captionSize, size)}
                  textAnchor={lane.anchor}
                  className="fill-muted-foreground"
                  fontSize={captionSize}
                >
                  {neighbourCaption(end.neighbour)}
                </text>
              </g>
            )
          })
        )}
      </svg>
    </div>
  )
}

/**
 * Local passenger graph in line-diagram proportions (`LINE_DIAGRAM`):
 * route stroke = `x`, tick = 0.66x, interchange ring = 3x / 0.5x stroke.
 * Arm order follows geographic bearing when coordinates exist; radius
 * follows distance. Every movement pair is drawn — including ~180°
 * through-moves and unsupported pairs (dashed). Independent corridors
 * use the H layout above instead of a star.
 */
export const LocalGraphSvg = ({
  lineId,
  junction,
}: {
  lineId: string
  junction: JunctionReport
}) => {
  if (isMovementSplit(junction.neighbours, junction.corridors, junction.stubs)) {
    return <IndependentCorridorsSvg lineId={lineId} junction={junction} corridors={junction.corridors} />
  }

  const x = DIAGRAM_BASELINE.horizontal
  const size = 460
  const centre: Pt = { x: size / 2, y: size / 2 }
  const armRadius = scale(x, 11)
  const minArmRadius = scale(x, 7.5)
  const onwardLength = scale(x, 5)
  const ringOuter = interchangeOuterRadius(x)
  const ringStroke = interchangeStroke(x)
  const tickProtrude = scale(x, LINE_DIAGRAM.stationTick)
  const tickAlong = x
  const tickAcross = x + tickProtrude * 2
  const indicatorWidth = scale(x, LINE_DIAGRAM.parallel.stroke)
  const indicatorOffset = x / 2 + indicatorWidth / 2 + scale(x, LINE_DIAGRAM.stationTick)
  const indicatorNear = ringOuter + indicatorOffset + x
  const nameSize = horizontalStationFontSize(x)
  const captionSize = scale(x, HORIZONTAL_NAME_SIZE_UNITS * 0.55)
  const nameClearance = scale(x, LINE_DIAGRAM.layout.nameBelowLine) + x / 2
  const paint = lineCssPaint(lineId)
  const markerId = `arrow-${lineId}-${junction.station.id}`

  const supportedPairs: [string, string][] = junction.matrix
    .filter((pair) => pair.supported)
    .map((pair) => [pair.a.id, pair.b.id])
  const displayBearings = displayBearingsById(junction.neighbours)
  const orderedNeighbours = displayBearings
    ? [...junction.neighbours].sort((a, b) => {
        const ba = displayBearings.get(a.id)
        const bb = displayBearings.get(b.id)
        if (ba == null || bb == null) return 0
        return ba - bb
      })
    : bestNeighbourOrder(junction.neighbours, supportedPairs)

  const knownDistances = junction.neighbours
    .map((neighbour) => neighbour.distanceM)
    .filter((value): value is number => value != null)
  const dMin = knownDistances.length > 0 ? Math.min(...knownDistances) : 0
  const dMax = knownDistances.length > 0 ? Math.max(...knownDistances) : 0
  const radiusOf = (neighbour: NeighbourRef): number => {
    if (neighbour.distanceM == null || dMax <= dMin) return armRadius
    const t = (neighbour.distanceM - dMin) / (dMax - dMin)
    return minArmRadius + (armRadius - minArmRadius) * t
  }

  const laid = orderedNeighbours.map((neighbour, index) => {
    const radius = radiusOf(neighbour)
    const point = displayBearings?.has(neighbour.id)
      ? pointFromBearing(displayBearings.get(neighbour.id)!, radius, centre.x, centre.y)
      : polarPoint(index, orderedNeighbours.length, radius, centre.x, centre.y)
    const outward = unit(point.x - centre.x, point.y - centre.y)
    const side = labelSide(outward)
    const horizontal = Math.abs(outward.x) > Math.abs(outward.y)
    const captionSide: Pt = horizontal ? { x: 0, y: 1 } : side
    const lineEnd: Pt =
      neighbour.degree === 2
        ? { x: point.x + outward.x * onwardLength, y: point.y + outward.y * onwardLength }
        : point
    const placement: LabelPlacement = { anchor: horizontal ? "middle" : labelAnchor(outward, side) }
    const captionPlacement: LabelPlacement = { anchor: horizontal ? "middle" : labelAnchor(outward, captionSide) }
    const nameAt: Pt = {
      x: point.x + side.x * nameClearance,
      y: point.y + side.y * nameClearance,
    }
    const captionAt: Pt = {
      x: lineEnd.x + outward.x * (x * 0.7) + captionSide.x * nameClearance,
      y: lineEnd.y + outward.y * (x * 0.7) + captionSide.y * nameClearance,
    }
    const tickDeg = (Math.atan2(outward.y, outward.x) * 180) / Math.PI
    return { neighbour, point, lineEnd, placement, captionPlacement, nameAt, captionAt, tickDeg, radius }
  })
  const byId = new Map(laid.map((entry) => [entry.neighbour.id, entry]))

  return (
    <div>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Local graph around ${junction.station.name}`}
        data-line={lineId}
        data-tfl-diagram={lineId === "cable-car" ? "" : undefined}
        className="h-auto w-full overflow-visible"
      >
        <defs>
          <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={paint} />
          </marker>
        </defs>

        <text
          x={centre.x}
          y={14}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize={captionSize}
        >
          N
        </text>

        {laid.map(({ neighbour, lineEnd }) => (
          <line
            key={`spoke-${neighbour.id}`}
            x1={centre.x}
            y1={centre.y}
            x2={lineEnd.x}
            y2={lineEnd.y}
            stroke={paint}
            strokeWidth={x}
            strokeLinecap="butt"
          />
        ))}

        {laid.map(({ neighbour, point, tickDeg }) => (
          <rect
            key={`tick-${neighbour.id}`}
            x={point.x - tickAlong / 2}
            y={point.y - tickAcross / 2}
            width={tickAlong}
            height={tickAcross}
            fill={paint}
            transform={`rotate(${tickDeg} ${point.x} ${point.y})`}
          />
        ))}

        {junction.matrix.flatMap((pair) => {
          const a = byId.get(pair.a.id)
          const b = byId.get(pair.b.id)
          if (!a || !b) return []
          const bothWays = pair.aThenB > 0 && pair.bThenA > 0
          const from = pair.aThenB > 0 || !pair.supported ? a.point : b.point
          const to = pair.aThenB > 0 || !pair.supported ? b.point : a.point
          const far = Math.min(a.radius, b.radius) - tickProtrude - x
          const paths = trackPairPaths(from, to, centre, indicatorOffset, indicatorNear, far)
          return paths.map((d, pathIndex) => (
            <path
              key={`${pair.a.id}-${pair.b.id}-${pathIndex}`}
              d={d}
              fill="none"
              stroke={pair.supported ? paint : "var(--muted-foreground)"}
              strokeWidth={indicatorWidth}
              strokeLinecap="round"
              strokeDasharray={pair.supported ? undefined : "5 4"}
              opacity={pair.supported ? 1 : 0.7}
              markerEnd={pair.supported && !bothWays && pathIndex === 0 ? `url(#${markerId})` : undefined}
            >
              <title>
                {pair.supported
                  ? bothWays
                    ? `Permitted both ways through ${junction.station.name}`
                    : `Permitted one way: ${pair.aThenB > 0 ? pair.a.name : pair.b.name} → ${pair.aThenB > 0 ? pair.b.name : pair.a.name}`
                  : `No through-run ${pair.a.name} ↔ ${pair.b.name}`}
              </title>
            </path>
          ))
        })}

        <circle
          cx={centre.x}
          cy={centre.y}
          r={ringOuter - ringStroke / 2}
          fill="var(--background)"
          stroke="var(--foreground)"
          strokeWidth={ringStroke}
        />

        {laid.map(({ neighbour, placement, captionPlacement, nameAt, captionAt }) => {
          const name = shortName(neighbour.name)
          const caption = neighbourCaption(neighbour)
          const nameX = clampLabelX(nameAt.x, placement.anchor, size)
          const captionX = clampLabelX(captionAt.x, captionPlacement.anchor, size)
          return (
            <g key={`label-${neighbour.id}`}>
              <text
                x={nameX}
                y={clampLabelY(nameAt.y, nameSize, size)}
                textAnchor={placement.anchor}
                className="fill-foreground font-medium"
                fontSize={nameSize}
              >
                {name}
              </text>
              <text
                x={captionX}
                y={clampLabelY(captionAt.y, captionSize, size)}
                textAnchor={captionPlacement.anchor}
                className="fill-muted-foreground"
                fontSize={captionSize}
              >
                {caption}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

