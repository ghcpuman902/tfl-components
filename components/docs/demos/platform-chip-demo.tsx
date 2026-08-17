"use client";

import { ArrivalsResizeDemo } from "@/components/docs/demos/station-labels-explainer";
import { PlatformChip } from "@/components/tfl/arrivals/platform-chip";

const PLATFORM_FORM_WIDTHS = [232, 208, 184, 160] as const;

const PlatformWidthDemo = () => (
  <ul className="flex flex-col gap-3">
    {PLATFORM_FORM_WIDTHS.map((width) => (
      <li key={width}>
        <div
          className="@container/arrivals flex h-8 items-center gap-3"
          style={{ width }}
        >
          <PlatformChip number="4" />
          <span className="text-xs tabular-nums text-muted-foreground">
            {width}px
          </span>
        </div>
      </li>
    ))}
  </ul>
);

export default function PlatformChipDemo() {
  return (
    <div className="space-y-6">
      <PlatformWidthDemo />
      <ArrivalsResizeDemo />
    </div>
  );
}
