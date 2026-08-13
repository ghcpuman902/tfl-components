import { BusNumberChip } from "@/components/tfl/arrivals/bus-number-chip";

const ROUTES = ["73", "24", "N253", "EL1", "9"] as const;

/** Presentational — no API keys required. */
export default function BusNumberChipDemo() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ROUTES.map((route) => (
        <BusNumberChip key={route} label={route} />
      ))}
    </div>
  );
}
