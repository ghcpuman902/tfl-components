import { LiveArrivalsBoard } from "@/components/tfl/arrivals/live-arrivals-board";

export default function LiveArrivalsBoardDemo() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Polls Oxford Circus every 15s by default. Requires server API keys.
      </p>
      <LiveArrivalsBoard />
    </div>
  );
}
