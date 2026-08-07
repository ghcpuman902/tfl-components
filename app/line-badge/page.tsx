import type { Metadata } from "next";
import { LineBadge, LineColorBar } from "@/components/tfl/line-badge";

export const metadata: Metadata = {
  title: "Line badge — tfl-components",
  description:
    "Official TfL line colour badges with dark-mode outline or white contrast.",
};

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

export default function LineBadgePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Line badge</h1>
        <p className="mt-2 text-muted-foreground">
          Primitive chip using{" "}
          <code className="rounded bg-muted px-1 text-xs">getLineInlineStyles</code>{" "}
          and dark-mode contrast helpers. Default for Northern is{" "}
          <code className="rounded bg-muted px-1 text-xs">outline</code> (outside
          text stroke, with hard text-shadow fallback). Pass{" "}
          <code className="rounded bg-muted px-1 text-xs">
            darkContrastMode=&quot;white&quot;
          </code>{" "}
          for white fill/text on chips, text, and colour bars.
        </p>
      </div>

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
          Same line, both modes — switch to dark theme to compare.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              outline (default)
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
          <div className="rounded-lg border border-border bg-card p-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              white
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <LineBadge
                lineId="northern"
                name="Northern"
                darkContrastMode="white"
              />
              <LineBadge
                lineId="northern"
                name="Northern"
                variant="text"
                darkContrastMode="white"
                className="text-base"
              />
            </div>
            <LineColorBar
              lineId="northern"
              modeName="tube"
              heightClass="h-[6px]"
              darkContrastMode="white"
            />
          </div>
        </div>
      </section>

      <aside className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">Install into your app</p>
        <pre className="overflow-x-auto rounded bg-muted p-3 text-xs text-foreground">
          {`pnpm dlx shadcn@latest add https://tfl-components.vercel.app/r/line-badge.json`}
        </pre>
      </aside>
    </div>
  );
}
