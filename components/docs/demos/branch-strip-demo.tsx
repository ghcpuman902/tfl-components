import { LineStrip } from "@/components/tfl/diagram/line-strip";
import { DIAGRAM_SCALE_CLASS } from "@/lib/tfl/line-diagram";
import { NORTHERN_LINE_SCHEMATIC_HORIZONTAL } from "@/lib/tfl/fixtures/northern-line-schematic-horizontal";
import { NORTHERN_LINE_SCHEMATIC_VERTICAL } from "@/lib/tfl/fixtures/northern-line-schematic-vertical";
import { cn } from "@/lib/utils";

export default function BranchStripDemo() {
  return (
    <div className={cn("w-full min-w-0 space-y-10", DIAGRAM_SCALE_CLASS)}>
      <div className="space-y-4">
        <p className="max-w-prose text-sm text-muted-foreground">
          Northern line, horizontal and vertical. Separate schematics, not one
          graph rotated. Duplicate Euston nodes where the corridors run
          parallel.
        </p>

        <ul className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {NORTHERN_LINE_SCHEMATIC_HORIZONTAL.branches.map((branch) => (
            <li key={branch.id}>
              <span
                data-line="northern"
                className="mr-1.5 inline-block size-2.5 rounded-sm bg-[var(--line-color)]"
                aria-hidden
              />
              {branch.name}
            </li>
          ))}
        </ul>
      </div>

      <section className="space-y-3" aria-labelledby="branch-horizontal">
        <h2
          id="branch-horizontal"
          className="text-lg font-semibold"
        >
          Horizontal
        </h2>
        <LineStrip
          lineId="northern"
          schematic={NORTHERN_LINE_SCHEMATIC_HORIZONTAL}
          orientation="horizontal"
        />
      </section>

      <section className="space-y-3" aria-labelledby="branch-mono">
        <h2 id="branch-mono" className="text-lg font-semibold">
          Mono
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Same horizontal schematic with B&amp;W stroke motifs. Pass{" "}
          <code className="text-xs">mono</code> — only the graph paints this
          way, not titles or chips.
        </p>
        <LineStrip
          lineId="northern"
          schematic={NORTHERN_LINE_SCHEMATIC_HORIZONTAL}
          orientation="horizontal"
          mono
        />
      </section>

      <section className="space-y-3" aria-labelledby="branch-vertical">
        <h2
          id="branch-vertical"
          className="text-lg font-semibold"
        >
          Vertical
        </h2>
        <div className="max-h-[70vh] overflow-auto rounded-lg border border-border">
          <LineStrip
            lineId="northern"
            schematic={NORTHERN_LINE_SCHEMATIC_VERTICAL}
            orientation="vertical"
            className="p-4"
          />
        </div>
      </section>
    </div>
  );
}
