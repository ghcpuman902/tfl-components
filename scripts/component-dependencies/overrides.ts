import type { ComponentGraphOverride } from "@/lib/dev/component-graph/types"

/**
 * Human / agent overrides keyed by repo-relative module path
 * (e.g. `registry/tfl/brand/line-badge.tsx`).
 *
 * Regeneration validates keys against the latest skeleton. Edit this file —
 * never the generated `.cache/component-dependencies/*` output.
 */
export const COMPONENT_GRAPH_OVERRIDES: Record<string, ComponentGraphOverride> =
  {
    // Site-only fetch demos — not part of the published library contract.
    "registry/tfl/arrivals/live-arrivals-board.tsx": {
      include: false,
      note: "Site demo with fetch-inside; not the documented props API.",
    },
    "registry/tfl/arrivals/bus-arrivals.tsx": {
      include: false,
      note: "Interactive site demo (geolocation + fetch), not an installable board.",
    },
    // Block / lab surfaces — not reusable library components.
    "components/tfl/week-ahead/week-ahead-view.tsx": {
      include: false,
      note: "Week ahead Block composition surface.",
    },
    "components/tfl/week-ahead/week-ahead-section.tsx": {
      include: false,
      note: "Week ahead Block shell.",
    },
    "components/tfl/week-ahead/week-ahead-skeleton.tsx": {
      include: false,
      note: "Block skeleton only.",
    },
    "components/tfl/live-vehicles/live-bus-vehicles.tsx": {
      include: false,
      note: "Labs / docs live vehicle chrome.",
    },
    "components/tfl/live-vehicles/live-rail-vehicles.tsx": {
      include: false,
      note: "Labs / docs live vehicle chrome.",
    },
    "components/tfl/live-vehicles/live-vehicle-chrome.tsx": {
      include: false,
      note: "Labs / docs live vehicle chrome.",
    },
    "components/tfl/station-typography-lab.tsx": {
      include: false,
      note: "Typography tool lab, not a published primitive.",
    },
    "components/tfl/page-skeletons.tsx": {
      include: false,
      note: "Shared docs skeleton helpers.",
    },
    "components/tfl/maps/geographic-map-placeholder.tsx": {
      include: false,
      note: "Docs placeholder, not a map product.",
    },
    // Draft atoms — visible orphans until promoted.
    "components/tfl/diagram-anchor-box.tsx": {
      note: "Draft diagram atom; orphan until vertex scenarios promote it.",
    },
    "components/tfl/line-flag-stack.tsx": {
      note: "Draft diagram atom; orphan until vertex scenarios promote it.",
    },
    "components/tfl/anchored-station-name.tsx": {
      note: "Draft label atom; orphan until diagram atoms promote it.",
    },
  }
