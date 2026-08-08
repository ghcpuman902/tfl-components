import { LineBadge, LineColorBar } from "@/components/tfl/brand/line-badge";

const DEMO_LINES = [
  { id: "central", name: "Central" },
  { id: "northern", name: "Northern" },
  { id: "victoria", name: "Victoria" },
  { id: "elizabeth", name: "Elizabeth" },
  { id: "jubilee", name: "Jubilee" },
  { id: "bakerloo", name: "Bakerloo" },
  { id: "piccadilly", name: "Piccadilly" },
  { id: "district", name: "District" },
] as const;

/** Presentational — no API keys required. */
export default function LineBadgeDemo() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Chip variant</h2>
        <div className="flex flex-wrap gap-2">
          {DEMO_LINES.map((line) => (
            <LineBadge key={line.id} lineId={line.id} name={line.name} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Text variant + colour bars</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {DEMO_LINES.map((line) => (
            <li
              key={line.id}
              className="rounded-lg border border-border bg-card p-3"
            >
              <LineBadge
                lineId={line.id}
                name={line.name}
                variant="text"
                className="text-base"
              />
              <div className="mt-2">
                <LineColorBar
                  lineId={line.id}
                  modeName={line.id === "elizabeth" ? "elizabeth-line" : "tube"}
                  heightClass="h-[6px]"
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Northern dark contrast</h2>
        <p className="text-sm text-muted-foreground">
          Brand black fill with a hard white outline — switch to dark theme to
          see the outline.
        </p>
        <div className="space-y-3 rounded-lg border border-border bg-card p-3">
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
      </section>
    </div>
  );
}
