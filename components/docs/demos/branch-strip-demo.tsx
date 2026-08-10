import { getLineColor } from "tfl-ts";
import { LineStrip } from "@/components/tfl/diagram/line-strip";
import { DIAGRAM_SCALE_CLASS } from "@/lib/tfl/line-diagram";
import { NORTHERN_LINE_SCHEMATIC_HORIZONTAL } from "@/lib/tfl/fixtures/northern-line-schematic-horizontal";
import { NORTHERN_LINE_SCHEMATIC_VERTICAL } from "@/lib/tfl/fixtures/northern-line-schematic-vertical";
import { cn } from "@/lib/utils";

export default function BranchStripDemo() {
  const color = getLineColor("northern").hex;

  return (
    <div className={cn("w-full min-w-0 space-y-10", DIAGRAM_SCALE_CLASS)}>
      <div className="space-y-4">
        <p className="max-w-prose text-sm text-muted-foreground">
          Atomic <code className="text-xs">BranchStrip</code> via molecular{" "}
          <code className="text-xs">LineStrip</code> (no live TfL fetch).
          Horizontal and vertical each use their own{" "}
          <code className="text-xs">lane × pos</code> layout — including
          duplicate Euston nodes — rather than rotating one graph. Labels use{" "}
          <code className="text-xs">StationName</code> for find/copy/aria, with
          editorial line breaks prepared by <code className="text-xs">LineStrip</code>.
        </p>

        <ul className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {NORTHERN_LINE_SCHEMATIC_HORIZONTAL.branches.map((branch) => (
            <li key={branch.id}>
              <span
                className="mr-1.5 inline-block size-2.5 rounded-sm"
                style={{ backgroundColor: color }}
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
          lineColor={color}
          orientation="horizontal"
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
            lineColor={color}
            orientation="vertical"
            className="p-4"
          />
        </div>
      </section>
    </div>
  );
}
