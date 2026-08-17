import { ColourTokenPins } from "@/components/docs/demos/colour-token-pins";
import { DocsResizeFrame } from "@/components/docs/docs-resize-frame";
import { LineChipWall } from "@/components/docs/demos/line-chip-wall";
import {
  LineBadge,
  LineBadgeGroup,
  LineColorBar,
} from "@/components/tfl/brand/line-badge";
import {
  getLineColourBarMode,
  LINE_COLOUR_TOKENS,
} from "@/lib/tfl/line-colour-map";

const DEMO_LINES = LINE_COLOUR_TOKENS.map((token) => ({
  id: token.id,
  name: token.name,
  modeName: getLineColourBarMode(token.id),
  diagram: token.id === "cable-car",
}));

/** Real stations where distinct brand colours share platforms / track. */
const SHARED_TRACK_EXAMPLES = [
  {
    station: "Great Portland Street",
    note: "Circle · H&C · Metropolitan",
    lineIds: ["circle", "hammersmith-city", "metropolitan"] as const,
  },
  {
    station: "Aldgate East",
    note: "District · H&C",
    lineIds: ["district", "hammersmith-city"] as const,
  },
  {
    station: "South Kensington",
    note: "Circle · District",
    lineIds: ["circle", "district"] as const,
  },
] as const;

/** Line chip preview — filled chips, shared-track group, colour bars. */
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
          . Cable Car chips use map red via{" "}
          <code className="text-xs">diagram</code>.
        </p>
        <LineChipWall />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Smart shrink</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Single-line chips opt in with{" "}
          <code className="text-xs">fit=&quot;shrink&quot;</code>. Board headers
          live on{" "}
          <a
            href="/docs/line-title"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Line title
          </a>
          .
        </p>
        <DocsResizeFrame
          defaultWidth={280}
          minWidth={72}
          maxWidth={420}
          captionSuffix=" · resize to step chip labels"
          className="space-y-3 p-3"
        >
          <LineBadge lineId="hammersmith-city" fit="shrink" />
        </DocsResizeFrame>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Shared-track groups</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Prefer ≤3 lines. Resize to step full → H&C → short codes.
        </p>
        <DocsResizeFrame
          defaultWidth={360}
          minWidth={72}
          maxWidth={520}
          captionSuffix=" · resize"
          className="space-y-4 p-3"
        >
          {SHARED_TRACK_EXAMPLES.map((example) => (
            <div key={example.station} className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {example.station}
                <span className="text-muted-foreground/80">
                  {" "}
                  — {example.note}
                </span>
              </p>
              <LineBadgeGroup lineIds={example.lineIds} />
            </div>
          ))}
          <div className="flex items-center gap-3">
            <LineBadgeGroup
              variant="codes"
              lineIds={["circle", "hammersmith-city", "metropolitan"]}
            />
            <p className="text-xs text-muted-foreground">
              Row codes — stripe stack, one 3-letter abbr at a time
            </p>
          </div>
        </DocsResizeFrame>
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
                diagram={line.diagram}
                heightClass="h-[6px]"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
