import { ColourFormatsTable } from "@/components/docs/colour-formats-table";
import { BwLineStylesCompare } from "@/components/docs/demos/bw-line-styles-compare";
import { LineBadge, LineColorBar } from "@/components/tfl/brand/line-badge";
import {
  CABLE_CAR_MAP_COLOUR,
  OVERGROUND_LINE_COLOURS,
  TFL_MODAL_COLOURS,
  UNDERGROUND_LINE_COLOURS,
  type BrandColourSpec,
} from "@/lib/tfl/brand-colours";

type DemoMode =
  | "tube"
  | "elizabeth-line"
  | "overground"
  | "dlr"
  | "tram"
  | "cable-car";

type DemoLine = {
  id: string;
  name: string;
  modeName: DemoMode;
  spec: BrandColourSpec;
  /** Map paint that differs from mode identity (Cable Car red rails). */
  mapColor?: string;
};

/** Full suite with published Colour standard / Issue 4 tokens. */
const DEMO_LINES: DemoLine[] = [
  {
    id: "bakerloo",
    name: "Bakerloo",
    modeName: "tube",
    spec: UNDERGROUND_LINE_COLOURS.bakerloo,
  },
  {
    id: "central",
    name: "Central",
    modeName: "tube",
    spec: UNDERGROUND_LINE_COLOURS.central,
  },
  {
    id: "circle",
    name: "Circle",
    modeName: "tube",
    spec: UNDERGROUND_LINE_COLOURS.circle,
  },
  {
    id: "district",
    name: "District",
    modeName: "tube",
    spec: UNDERGROUND_LINE_COLOURS.district,
  },
  {
    id: "hammersmith-city",
    name: "Hammersmith & City",
    modeName: "tube",
    spec: UNDERGROUND_LINE_COLOURS.hammersmithCity,
  },
  {
    id: "jubilee",
    name: "Jubilee",
    modeName: "tube",
    spec: UNDERGROUND_LINE_COLOURS.jubilee,
  },
  {
    id: "metropolitan",
    name: "Metropolitan",
    modeName: "tube",
    spec: UNDERGROUND_LINE_COLOURS.metropolitan,
  },
  {
    id: "northern",
    name: "Northern",
    modeName: "tube",
    spec: UNDERGROUND_LINE_COLOURS.northern,
  },
  {
    id: "piccadilly",
    name: "Piccadilly",
    modeName: "tube",
    spec: UNDERGROUND_LINE_COLOURS.piccadilly,
  },
  {
    id: "victoria",
    name: "Victoria",
    modeName: "tube",
    spec: UNDERGROUND_LINE_COLOURS.victoria,
  },
  {
    id: "waterloo-city",
    name: "Waterloo & City",
    modeName: "tube",
    spec: UNDERGROUND_LINE_COLOURS.waterlooCity,
  },
  {
    id: "elizabeth",
    name: "Elizabeth",
    modeName: "elizabeth-line",
    spec: TFL_MODAL_COLOURS.elizabeth,
  },
  {
    id: "dlr",
    name: "DLR",
    modeName: "dlr",
    spec: TFL_MODAL_COLOURS.dlr,
  },
  {
    id: "tram",
    name: "Tram",
    modeName: "tram",
    spec: TFL_MODAL_COLOURS.trams,
  },
  {
    id: "overground",
    name: "Overground",
    modeName: "overground",
    spec: TFL_MODAL_COLOURS.overground,
  },
  {
    id: "liberty",
    name: "Liberty",
    modeName: "overground",
    spec: OVERGROUND_LINE_COLOURS.liberty,
  },
  {
    id: "lioness",
    name: "Lioness",
    modeName: "overground",
    spec: OVERGROUND_LINE_COLOURS.lioness,
  },
  {
    id: "mildmay",
    name: "Mildmay",
    modeName: "overground",
    spec: OVERGROUND_LINE_COLOURS.mildmay,
  },
  {
    id: "suffragette",
    name: "Suffragette",
    modeName: "overground",
    spec: OVERGROUND_LINE_COLOURS.suffragette,
  },
  {
    id: "weaver",
    name: "Weaver",
    modeName: "overground",
    spec: OVERGROUND_LINE_COLOURS.weaver,
  },
  {
    id: "windrush",
    name: "Windrush",
    modeName: "overground",
    spec: OVERGROUND_LINE_COLOURS.windrush,
  },
  {
    id: "cable-car",
    name: "Cable Car",
    modeName: "cable-car",
    spec: CABLE_CAR_MAP_COLOUR,
    mapColor: CABLE_CAR_MAP_COLOUR.hex,
  },
];

/** Presentational — no API keys required. */
export default function LineBadgeDemo() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Chip variant</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Colours resolve from <code className="text-xs">data-line</code> →{" "}
          <code className="text-xs">--line-color</code> (OKLCH tokens). Cable Car
          chips use map red via an explicit <code className="text-xs">color</code>{" "}
          override; mode identity stays purple.
        </p>
        <div className="flex flex-wrap gap-2">
          {DEMO_LINES.map((line) => (
            <LineBadge
              key={line.id}
              lineId={line.id}
              name={line.name}
              color={line.mapColor}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Colour formats</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Light and dark screen tokens as OKLCH + HEX (dark = brand + Go night
          method; Northern <code className="text-xs">#FCFCFC</code>). Dark
          columns sit on charcoal paper. Print is published CMYK / Pantone / NCS
          (<code className="text-xs">device-cmyk()</code> when available). Click
          a cell to copy. Scroll sideways on narrow widths.
        </p>
        <ColourFormatsTable lines={DEMO_LINES} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Mono line styles</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Colour route paint vs black-and-white Tube map stroke patterns
          (provisional reconstruction of the{" "}
          <a
            href="https://content.tfl.gov.uk/bw-large-print-tube-map.pdf"
            className="underline underline-offset-4 hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            large-print B&amp;W map
          </a>{" "}
          key). These are the motifs{" "}
          <code className="text-xs">data-tfl-colour=&quot;mono&quot;</code> will
          carry once wired into strips — not yet the live CSS role tokens.
        </p>
        <BwLineStylesCompare />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Dark map (Go night method)</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Forced <code className="text-xs">.dark</code> panel on charcoal{" "}
          <code className="text-xs">#2C2C32</code>. Tokens use brand + Go
          night OKLCH method; Northern defaults to{" "}
          <code className="text-xs">#FCFCFC</code>. Research scratch:{" "}
          <a
            href="/temp/tfl-go-colours"
            className="underline underline-offset-4 hover:text-foreground"
          >
            /temp/tfl-go-colours
          </a>
          .
        </p>
        <div
          className="dark space-y-3 p-4 text-foreground"
          style={{ backgroundColor: "#2C2C32" }}
        >
          <div className="space-y-2">
            {DEMO_LINES.map((line) => (
              <div
                key={`dark-${line.id}`}
                className="grid grid-cols-[minmax(6rem,8rem)_1fr] items-center gap-3"
              >
                <span className="text-xs text-white/55">{line.name}</span>
                <LineColorBar
                  lineId={line.id}
                  modeName={line.modeName}
                  color={line.mapColor}
                  heightClass="h-[6px]"
                />
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-white/10 pt-3">
            <p className="text-xs text-white/55">
              Northern default (<code className="text-[11px]">#FCFCFC</code>)
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <LineBadge lineId="northern" name="Northern" />
              <LineBadge
                lineId="northern"
                name="Northern"
                variant="text"
                className="text-base"
              />
            </div>
            <LineColorBar
              lineId="northern"
              modeName="tube"
              heightClass="h-[6px]"
            />
          </div>

          <div
            className="space-y-2 border-t border-white/10 pt-3"
            data-tfl-northern="halo"
          >
            <p className="text-xs text-white/55">
              Opt-in halo —{" "}
              <code className="text-[11px]">data-tfl-northern=&quot;halo&quot;</code>{" "}
              keeps brand black. Filled chips already have controlled ink — no
              outline. Use{" "}
              <code className="text-[11px]">.tfl-northern-halo-stroke</code> /{" "}
              <code className="text-[11px]">.tfl-northern-halo-bar</code> only
              when paint sits on an uncontrolled background (text / bar here).
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <LineBadge lineId="northern" name="Northern" />
              <LineBadge
                lineId="northern"
                name="Northern"
                variant="text"
                className="tfl-northern-halo-stroke text-base"
              />
            </div>
            <LineColorBar
              lineId="northern"
              modeName="tube"
              heightClass="h-[6px] tfl-northern-halo-bar"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
