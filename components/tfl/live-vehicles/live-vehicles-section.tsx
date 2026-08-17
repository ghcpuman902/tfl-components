import { LiveVehiclesClient } from "@/components/tfl/live-vehicles/live-vehicles-client";
import { getLiveVehiclesAction } from "@/lib/tfl/live-vehicles-action";

const LiveVehiclesFallback = () => (
  <div
    className="grid gap-4 md:grid-cols-2"
    aria-hidden
  >
    <div className="h-[min(60vh,28rem)] animate-pulse bg-muted" />
    <div className="h-[min(60vh,28rem)] animate-pulse bg-muted" />
  </div>
);

export const LiveVehiclesSection = async () => {
  const result = await getLiveVehiclesAction();
  if (!result.ok) {
    return (
      <p className="px-4 text-sm text-muted-foreground">{result.error}</p>
    );
  }
  return <LiveVehiclesClient initial={result.data} />;
};

export { LiveVehiclesFallback };
