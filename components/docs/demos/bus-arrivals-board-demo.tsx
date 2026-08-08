import { BusArrivals } from "@/components/tfl/arrivals/bus-arrivals";

export default function BusArrivalsBoardDemo() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Interactive board — geolocation or search, then live arrivals. Requires
        server API keys.
      </p>
      <BusArrivals />
    </div>
  );
}
