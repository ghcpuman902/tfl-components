import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { LineBadge, LineColorBar } from "@/components/tfl/line-badge";

export const metadata: Metadata = {
  title: "Line badge — tfl-components",
  description: "Official TfL line colour badges with dark-mode outlines.",
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
    <div className="min-h-svh">
      <SiteHeader pathname="/line-badge" />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6">
        <div>
          <h1 className="text-3xl font-bold">Line badge</h1>
          <p className="mt-2 text-muted-foreground">
            Primitive chip using{" "}
            <code className="rounded bg-muted px-1 text-xs">getLineInlineStyles</code>{" "}
            and dark-mode hard outlines. Northern stays black — contrast is an
            outline ring, not a white fill.
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

        <aside className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">Install into your app</p>
          <pre className="overflow-x-auto rounded bg-muted p-3 text-xs text-foreground">
            {`pnpm dlx shadcn@latest add https://tfl-components.vercel.app/r/line-badge.json`}
          </pre>
        </aside>
      </main>
    </div>
  );
}
