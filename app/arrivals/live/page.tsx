import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { LiveArrivalsBoard } from "@/components/tfl/live-arrivals-board";

export const metadata: Metadata = {
  title: "Live arrivals — tfl-components",
  description: "Polling tube arrivals board powered by tfl-ts.",
};

export default function LiveArrivalsPage() {
  return (
    <div className="min-h-svh">
      <SiteHeader pathname="/arrivals/live" />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <LiveArrivalsBoard />
        <aside className="mt-10 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          <p>
            Polls every 15s via a server action wrapping{" "}
            <code className="text-xs">stopPoint.getArrivals</code>. Prefer
            intervals of 10–15s+ per stop to stay within TfL rate limits.
          </p>
        </aside>
      </main>
    </div>
  );
}
