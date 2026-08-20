import { cn } from "@/lib/utils"
import {
  diagramUnitStyle,
  verticalDiagramMetrics,
} from "@/lib/tfl/line-diagram"
import { type DiagramStation } from "@/lib/tfl/diagram-station"
import {
  DiagramConnectionFlags,
  DiagramStationMarker,
  resolveMapMarkerKind,
  VerticalRouteLine,
} from "@/components/tfl/diagram/diagram-markers"
import { StationName } from "@/components/tfl/station-name"
import { NationalRailPictogram } from "@/components/tfl/national-rail-pictogram"

export type LineRouteDiagramProps = {
  stations: DiagramStation[]
  /** Hex route colour (use getLineColor / getLineInlineStyles in callers). */
  lineColor: string
  lineName?: string
  directionLabel?: string
  /**
   * Absolute route line thickness in px.
   * When omitted, uses `DIAGRAM_BASELINE.vertical` × `--tfl-diagram-scale`.
   */
  x?: number
  className?: string
}

/**
 * Vertical full-line map: continuous route with right-side ticks, terminal
 * crossbars, interchange rings, and §11-scale station names.
 */
export const LineRouteDiagram = ({
  stations,
  lineColor,
  lineName,
  directionLabel,
  x,
  className,
}: LineRouteDiagramProps) => {
  if (stations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No stations to display.</p>
    )
  }

  const m = verticalDiagramMetrics()
  const lastIndex = stations.length - 1

  return (
    <div
      className={cn("w-full", className)}
      style={diagramUnitStyle("vertical", x)}
    >
      {(lineName || directionLabel) && (
        <div className="mb-4 flex flex-wrap items-baseline gap-2">
          {lineName ? (
            <h2
              className="font-semibold"
              style={{ color: lineColor, fontSize: m.titleSize }}
            >
              {lineName}
            </h2>
          ) : null}
          {directionLabel ? (
            <span
              className="text-muted-foreground"
              style={{ fontSize: m.flagFont }}
            >
              {directionLabel}
            </span>
          ) : null}
        </div>
      )}

      <ol className="relative m-0 list-none p-0">
        <VerticalRouteLine
          lineColor={lineColor}
          markerCol={m.markerCol}
          rowGap={m.rowGap}
        />

        {stations.map((station, index) => {
          const kind = resolveMapMarkerKind({
            interchange: station.interchange,
            isEndpoint: index === 0 || index === lastIndex,
          })
          const connections = station.connections

          return (
            <li
              key={`${station.id}-${index}`}
              className="relative flex items-center"
              style={{
                minHeight: m.rowGap,
                columnGap: m.nameGap,
              }}
            >
              <DiagramStationMarker
                kind={kind}
                lineColor={lineColor}
                columnWidth={m.markerCol}
                slotHeight={m.markerSlot}
              />

              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="relative inline-flex max-w-full min-w-0 items-center">
                  <StationName
                    name={station.name}
                    layout="auto"
                    maxLines={2}
                    align="left"
                    className="min-w-0 font-medium text-foreground"
                    style={{ fontSize: m.nameSize }}
                  />
                  {station.nationalRail ? (
                    <span className="ml-1 inline-flex shrink-0 items-center self-end pb-0.5">
                      <NationalRailPictogram height="0.75em" />
                      <span className="sr-only">National Rail</span>
                    </span>
                  ) : null}
                </div>
                {connections &&
                connections.filter((c) => c.id !== "national-rail").length >
                  0 ? (
                  <DiagramConnectionFlags
                    stationId={station.id}
                    connections={connections.filter(
                      (c) => c.id !== "national-rail"
                    )}
                  />
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
