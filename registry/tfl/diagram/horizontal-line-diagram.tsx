import { cn } from "@/lib/utils";
import {
  diagramUnitStyle,
  horizontalDiagramMetrics,
} from "@/lib/tfl/line-diagram";
import {
  formatStationName,
  type DiagramStation,
} from "@/lib/tfl/diagram-station";

export type HorizontalDiagramStation = DiagramStation;

export type HorizontalLineDiagramProps = {
  stations: HorizontalDiagramStation[];
  /** Hex route colour. */
  lineColor: string;
  lineName?: string;
  /**
   * Absolute route line thickness in px (= unit x).
   * When omitted, uses `DIAGRAM_BASELINE.horizontal` × inherited
   * `--tfl-diagram-scale` (desktop scale 1 ≈ the Victoria strip reference).
   */
  x?: number;
  className?: string;
};

/**
 * Horizontal line diagram: horizontal station names above markers,
 * generous spacing between stops, §9 connection flag blocks stacked under
 * each station (square corners, line name inside). Wrap in overflow-x-auto.
 */
export const HorizontalLineDiagram = ({
  stations,
  lineColor,
  lineName,
  x,
  className,
}: HorizontalLineDiagramProps) => {
  if (stations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No stations to display.</p>
    );
  }

  const m = horizontalDiagramMetrics();
  const maxConnections = stations.reduce(
    (n, s) => Math.max(n, s.connections?.length ?? 0),
    0,
  );
  const connectionBand =
    maxConnections > 0
      ? `calc(${m.flagHeight} * ${maxConnections})`
      : undefined;
  const totalWidth = `calc(${m.colWidth} * ${stations.length})`;

  return (
    <div
      className={cn("w-max min-w-full", className)}
      style={diagramUnitStyle("horizontal", x)}
    >
      {lineName ? (
        <div className="mb-3">
          <span
            className="inline-block px-2.5 py-1 font-semibold text-white"
            style={{ backgroundColor: lineColor, fontSize: m.titleSize }}
          >
            {lineName}
          </span>
        </div>
      ) : null}

      <div className="relative" style={{ width: totalWidth }}>
        {/* Continuous route line through marker centres */}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: m.lineTop,
            left: `calc(${m.colWidth} / 2)`,
            right: `calc(${m.colWidth} / 2)`,
            height: m.lineWidth,
            backgroundColor: lineColor,
          }}
        />

        <ol className="relative m-0 flex list-none items-start p-0">
          {stations.map((station, index) => {
            const label = formatStationName(station.name);
            const isInterchange = Boolean(station.interchange);
            const connections = station.connections;

            return (
              <li
                key={`${station.id}-${index}`}
                className="relative flex shrink-0 flex-col items-center"
                style={{ width: m.colWidth }}
              >
                {/* Horizontal station name */}
                <div
                  className="flex items-end justify-center px-1.5 text-center"
                  style={{ height: m.nameBand }}
                >
                  <span
                    className="font-medium text-foreground"
                    style={{
                      fontSize: m.nameSize,
                      lineHeight: 1.15,
                    }}
                  >
                    {label}
                  </span>
                </div>

                {/* Marker on the route */}
                <div
                  className="relative z-10 flex items-center justify-center"
                  style={{
                    marginTop: m.nameGap,
                    width: m.colWidth,
                    height: m.markerBand,
                  }}
                >
                  {isInterchange ? (
                    <span
                      className="box-border block rounded-full bg-white"
                      style={{
                        width: m.ringOuter,
                        height: m.ringOuter,
                        borderWidth: m.ringStroke,
                        borderStyle: "solid",
                        borderColor: "#000",
                      }}
                      aria-hidden
                    />
                  ) : (
                    <span
                      className="block"
                      style={{
                        width: m.tickWidth,
                        height: m.tickHeight,
                        backgroundColor: lineColor,
                      }}
                      aria-hidden
                    />
                  )}
                </div>

                {/* §9 flag blocks — 1 CH tall, square, under the stop */}
                {connections && connections.length > 0 ? (
                  <div
                    className="inline-flex flex-col"
                    style={{
                      marginTop: m.flagClearance,
                      minHeight: connectionBand,
                    }}
                    aria-label={`Connections: ${connections.map((c) => c.name).join(", ")}`}
                  >
                    {connections.map((c) => (
                      <span
                        key={`${station.id}-${c.id}`}
                        className="flex w-full items-center justify-center px-1.5 leading-none font-medium whitespace-nowrap"
                        style={{
                          backgroundColor: c.color ?? "#64748b",
                          color: c.darkText ? "#0019A8" : "#fff",
                          height: m.flagHeight,
                          minWidth: m.flagMinWidth,
                          fontSize: m.flagFont,
                        }}
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div
                    aria-hidden
                    style={{
                      marginTop: m.flagClearance,
                      minHeight: connectionBand,
                    }}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};
