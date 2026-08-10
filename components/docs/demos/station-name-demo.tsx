"use client";

import { StationName } from "@/components/tfl/station-name";

const SAMPLES = [
  "King's Cross St. Pancras",
  "Highbury & Islington",
  "Shepherd's Bush Market",
  "Tottenham Court Road",
] as const;

export default function StationNameDemo() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Production <code className="text-xs">StationName</code> with{" "}
        <code className="text-xs">layout=&quot;auto&quot;</code>. Tune box width
        and scale in the{" "}
        <a href="/tools/typography" className="text-primary underline-offset-4 hover:underline">
          Station typography
        </a>{" "}
        tool.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {SAMPLES.map((name) => (
          <li
            key={name}
            className="rounded-lg border border-border p-3"
            style={{ width: 160 }}
          >
            <StationName
              name={name}
              layout="auto"
              maxWidth={140}
              maxLines={2}
              allowAbbreviation
              className="text-base font-medium"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
