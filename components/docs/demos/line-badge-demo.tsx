import { ColourTokenPins } from "@/components/docs/demos/colour-token-pins";
import { LineChipWall } from "@/components/docs/demos/line-chip-wall";
import { LineColorBar } from "@/components/tfl/brand/line-badge";
import { CABLE_CAR_MAP_COLOUR } from "@/lib/tfl/brand-colours";
import {
  getLineColourBarMode,
  LINE_COLOUR_TOKENS,
} from "@/lib/tfl/line-colour-map";

const DEMO_LINES = LINE_COLOUR_TOKENS.map((token) => ({
  id: token.id,
  name: token.name,
  modeName: getLineColourBarMode(token.id),
  mapColor: token.id === "cable-car" ? CABLE_CAR_MAP_COLOUR.hex : undefined,
}));

/** Line Badge primitive preview — chips and bars that consume colour tokens. */
export default function LineBadgeDemo() {
  return (
    <div className="space-y-8">
      <ColourTokenPins />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Chip</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Colours resolve from <code className="text-xs">data-line</code> →{" "}
          <code className="text-xs">--line-color</code>. Install tokens from{" "}
          <a
            href="/docs/colors"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Colours
          </a>
          . Cable Car chips use map red via an explicit{" "}
          <code className="text-xs">color</code> override.
        </p>
        <LineChipWall />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Colour bar</h2>
        <div className="space-y-2">
          {DEMO_LINES.slice(0, 12).map((line) => (
            <div
              key={`bar-${line.id}`}
              className="grid grid-cols-[minmax(6rem,8rem)_1fr] items-center gap-3"
            >
              <span className="text-xs text-muted-foreground">{line.name}</span>
              <LineColorBar
                lineId={line.id}
                modeName={line.modeName}
                color={line.mapColor}
                heightClass="h-[6px]"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
