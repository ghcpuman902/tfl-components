import {
  resolveDiagramLineColor,
  resolveRouteTrackStyle,
  type RouteTrackStyle,
} from "@/lib/tfl/route-track";
import {
  bwLineStyles,
  type BwLineStyleKey,
  type StrokeLayer,
} from "@/lib/tfl/bw-line-styles";

type Row = {
  name: string;
  lineId: string;
  bw: BwLineStyleKey;
};

/** Key order through National Rail, then Overground. */
const GROUPS: { label: string; rows: Row[] }[] = [
  {
    label: "Underground",
    rows: [
      { name: "Bakerloo", lineId: "bakerloo", bw: "bakerloo" },
      { name: "Central", lineId: "central", bw: "central" },
      { name: "Circle", lineId: "circle", bw: "circle" },
      { name: "District", lineId: "district", bw: "district" },
      {
        name: "Hammersmith & City",
        lineId: "hammersmith-city",
        bw: "hammersmithCity",
      },
      { name: "Jubilee", lineId: "jubilee", bw: "jubilee" },
      { name: "Metropolitan", lineId: "metropolitan", bw: "metropolitan" },
      { name: "Northern", lineId: "northern", bw: "northern" },
      { name: "Piccadilly", lineId: "piccadilly", bw: "piccadilly" },
      { name: "Victoria", lineId: "victoria", bw: "victoria" },
      { name: "Waterloo & City", lineId: "waterloo-city", bw: "waterlooCity" },
    ],
  },
  {
    label: "Other (through National Rail)",
    rows: [
      { name: "DLR", lineId: "dlr", bw: "dlr" },
      { name: "Elizabeth line", lineId: "elizabeth", bw: "elizabeth" },
      { name: "Trams", lineId: "tram", bw: "trams" },
      { name: "Cable Car", lineId: "london-cable-car", bw: "cableCar" },
      { name: "Thameslink", lineId: "thameslink", bw: "thameslink" },
      { name: "National Rail", lineId: "national-rail", bw: "nationalRail" },
    ],
  },
  {
    label: "Overground (tone × motif)",
    rows: [
      { name: "Liberty", lineId: "liberty", bw: "liberty" },
      { name: "Lioness", lineId: "lioness", bw: "lioness" },
      { name: "Mildmay", lineId: "mildmay", bw: "mildmay" },
      { name: "Suffragette", lineId: "suffragette", bw: "suffragette" },
      { name: "Weaver", lineId: "weaver", bw: "weaver" },
      { name: "Windrush", lineId: "windrush", bw: "windrush" },
    ],
  },
];

const STRAIGHT = "M 8 12 H 220";

const colourLayers = (
  color: string,
  trackStyle: RouteTrackStyle,
): StrokeLayer[] => {
  if (trackStyle === "cable-car") {
    return [
      { width: 8, stroke: color },
      { width: 5.2, stroke: "#fff" },
      { width: 2.4, stroke: color },
      { width: 0.8, stroke: "#fff" },
    ];
  }
  if (trackStyle === "parallel") {
    return [
      { width: 8, stroke: color },
      { width: 2.6, stroke: "#fff" },
    ];
  }
  return [{ width: 8, stroke: color }];
};

const RouteLayers = ({
  d,
  layers,
}: {
  d: string;
  layers: StrokeLayer[];
}) => (
  <g fill="none">
    {layers.map((layer, i) => (
      <path
        key={i}
        d={d}
        stroke={layer.stroke}
        strokeWidth={layer.width}
        strokeDasharray={layer.dash}
        strokeDashoffset={layer.dashoffset}
        strokeLinecap={layer.linecap ?? "butt"}
        strokeLinejoin="round"
      />
    ))}
  </g>
);

const Strip = ({ d, layers }: { d: string; layers: StrokeLayer[] }) => (
  <svg viewBox="0 0 228 24" className="h-6 w-full max-w-56" aria-hidden>
    <RouteLayers d={d} layers={layers} />
  </svg>
);

/**
 * Colour route paint vs B&W Tube-map stroke patterns (large-print key).
 * Shared by `/docs/colors` and the temp workshop page.
 */
export const BwLineStylesCompare = () => (
  <div
    className="grid items-center gap-x-4 gap-y-2"
    style={{ gridTemplateColumns: "minmax(9rem, 1fr) 1fr 1fr" }}
  >
    <div className="text-xs font-medium text-muted-foreground">Line</div>
    <div className="text-xs font-medium text-muted-foreground">Colour</div>
    <div className="text-xs font-medium text-muted-foreground">Mono</div>

    {GROUPS.map((group, groupIndex) => (
      <div key={group.label} className="contents">
        <div
          className={
            groupIndex === 0
              ? "col-span-3 text-xs font-medium text-muted-foreground"
              : "col-span-3 mt-3 border-t border-border pt-3 text-xs font-medium text-muted-foreground"
          }
        >
          {group.label}
        </div>
        {group.rows.map((row) => {
          const color = resolveDiagramLineColor(row.lineId);
          const trackStyle = resolveRouteTrackStyle(row.lineId);
          return (
            <div key={row.bw} className="contents">
              <div className="min-w-0 leading-tight">
                <div className="truncate">{row.name}</div>
                <div className="truncate font-mono text-[10px] text-muted-foreground">
                  {color} · {trackStyle}
                </div>
              </div>
              <div className="bg-white px-1 dark:bg-neutral-100">
                <Strip d={STRAIGHT} layers={colourLayers(color, trackStyle)} />
              </div>
              <div className="bg-white px-1 dark:bg-neutral-100">
                <Strip d={STRAIGHT} layers={bwLineStyles[row.bw]} />
              </div>
            </div>
          );
        })}
      </div>
    ))}
  </div>
);
