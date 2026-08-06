import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { BusArrivals } from "@/components/tfl/bus-arrivals";

export const metadata: Metadata = {
  title: "Bus arrivals — tfl-components",
  description:
    "Find nearby London bus stops and show live arrivals with route chips.",
};

export default function ArrivalsPage() {
  return (
    <div className="min-h-svh">
      <SiteHeader pathname="/arrivals" />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <BusArrivals />
        <aside className="mt-10 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">Install into your app</p>
          <pre className="overflow-x-auto rounded bg-muted p-3 text-xs text-foreground">
            {`pnpm dlx shadcn@latest add https://tfl-components.vercel.app/r/bus-arrivals-board.json`}
          </pre>
          <p className="mt-2">
            Bus rows use route-number chips — never tube line colours.
          </p>
        </aside>
      </main>
    </div>
  );
}
