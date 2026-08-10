import { BusNumberChip } from "@/components/tfl/arrivals/bus-number-chip";

const ROUTES = ["73", "24", "N253", "EL1", "9"] as const;

/** Presentational — no API keys required. */
export default function BusNumberChipDemo() {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Route codes</h2>
        <p className="text-sm text-muted-foreground">
          Fixed <code className="text-xs">5ch</code> bus-red rectangles —
          route codes as written, cap text-box trim for centering.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {ROUTES.map((route) => (
            <BusNumberChip key={route} label={route} />
          ))}
        </div>
      </section>
    </div>
  );
}
