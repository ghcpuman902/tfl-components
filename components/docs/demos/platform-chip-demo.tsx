import { PlatformChip } from "@/components/tfl/arrivals/platform-chip";

const WIDTH_STEPS = [
  { label: "Narrow", className: "w-64" },
  { label: "18rem+", className: "w-80" },
  { label: "26rem+", className: "w-[28rem]" },
  { label: "34rem+", className: "w-[36rem]" },
] as const;

/** Presentational — no API keys required. */
export default function PlatformChipDemo() {
  return (
    <ul className="space-y-3">
      {WIDTH_STEPS.map((step) => (
        <li key={step.label} className="space-y-1.5">
          <p className="text-xs text-muted-foreground">{step.label}</p>
          <div
            className={`@container/arrivals max-w-full rounded-md border border-border bg-background p-3 ${step.className}`}
          >
            <div className="flex items-center gap-2">
              <PlatformChip number="4" />
              <span className="text-sm font-medium">Canary Wharf</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
