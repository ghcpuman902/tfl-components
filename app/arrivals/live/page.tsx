import type { Metadata } from "next";
import { LiveArrivalsBoard } from "@/components/tfl/live-arrivals-board";

export const metadata: Metadata = {
  title: "Live arrivals — tfl-components",
  description: "Polling tube arrivals board powered by tfl-ts.",
};

export default function LiveArrivalsPage() {
  return (
    <>
      <LiveArrivalsBoard />
      <aside className="mt-10 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        <p>
          Polls every 15s via a server action wrapping{" "}
          <code className="text-xs">stopPoint.getArrivals</code>. Prefer
          intervals of 10–15s+ per stop to stay within TfL rate limits.
        </p>
      </aside>
    </>
  );
}
