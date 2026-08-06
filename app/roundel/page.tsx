import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { TfLRoundel } from "@/components/tfl/tfl-roundel";

export const metadata: Metadata = {
  title: "TfL Roundel — tfl-components",
  description:
    "Env-gated TfL roundel with a filled/rounded placeholder when the trademark flag is off.",
};

export default function RoundelPage() {
  const allowed =
    process.env.NEXT_PUBLIC_ALLOW_TFL_ROUNDEL === "true" ||
    process.env.VITE_ALLOW_TFL_ROUNDEL === "true" ||
    process.env.ALLOW_TFL_ROUNDEL === "true";

  return (
    <div className="min-h-svh">
      <SiteHeader pathname="/roundel" />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6">
        <div>
          <h1 className="text-3xl font-bold">TfL Roundel</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            The official roundel is trademarked. This component renders it only
            when you opt in via env. Otherwise you get a filled, rounded
            placeholder of the same size — hover for the enable instructions.
          </p>
        </div>

        <section className="flex flex-wrap items-end gap-8 rounded-lg border border-border bg-card p-6">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Current render
            </p>
            <TfLRoundel className="size-24" />
            <p className="text-sm">
              Mode:{" "}
              <code className="rounded bg-muted px-1 text-xs">
                {allowed ? "official (flag on)" : "placeholder (flag off)"}
              </code>
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Line colour override
            </p>
            <div className="flex flex-wrap gap-3">
              <TfLRoundel className="size-12" lineColor="#E32017" />
              <TfLRoundel className="size-12" lineColor="#0098D4" />
              <TfLRoundel className="size-12" lineColor="#000000" />
              <TfLRoundel className="size-12" lineColor="#6950A1" />
            </div>
          </div>
        </section>

        <aside className="space-y-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Enable the official mark</p>
          <pre className="overflow-x-auto rounded bg-muted p-3 text-xs text-foreground">
            {`# .env.local (Next.js)
NEXT_PUBLIC_ALLOW_TFL_ROUNDEL=true

# Vite
VITE_ALLOW_TFL_ROUNDEL=true`}
          </pre>
          <p>
            Setting the flag means <em>your</em> app accepts trademark
            responsibility. This package only delivers the SVG.
          </p>
          <pre className="overflow-x-auto rounded bg-muted p-3 text-xs text-foreground">
            {`pnpm dlx shadcn@latest add https://tfl-components.vercel.app/r/tfl-roundel.json`}
          </pre>
        </aside>
      </main>
    </div>
  );
}
