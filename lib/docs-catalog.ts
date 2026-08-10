/**
 * Single source for docs navigation, home catalog, and static params.
 * Groups follow frozen Stage 1 IA — docs/TARGET_ARCHITECTURE.md.
 */

export type DocsGroupId =
  | "start"
  | "explore"
  | "interfaces"
  | "primitives"
  | "foundations"
  | "maps"
  | "blocks"
  | "tools"
  | "drafts";

export type DocsEntryKind =
  | "page"
  | "component"
  | "tool"
  | "placeholder"
  | "draft"
  | "block";

/** Component layer for catalog badges — omit for start / tools / drafts indexes. */
export type DocsEntryLayer = "primitive" | "data-aware";

export type DocsEntry = {
  slug: string;
  title: string;
  description: string;
  group: DocsGroupId;
  kind: DocsEntryKind;
  /** Route path (absolute from site root). */
  href: string;
  /** Registry item name when installable via shadcn. */
  registryName?: string;
  /** Public registry JSON URL when installable. */
  registryUrl?: string;
  /** Rendering primitive vs data-aware board. */
  layer?: DocsEntryLayer;
};

export type DocsGroup = {
  id: DocsGroupId;
  title: string;
  description: string;
};

const REGISTRY_BASE = "https://tfl-components.vercel.app/r";

export const DOCS_GROUPS: readonly DocsGroup[] = [
  {
    id: "start",
    title: "Start",
    description: "What this environment is, installation, and credentials.",
  },
  {
    id: "explore",
    title: "Explore",
    description:
      "What TfL knows and how that information relates — not a Unified API endpoint list.",
  },
  {
    id: "interfaces",
    title: "Interfaces",
    description:
      "Data-aware components: pass normalised data as props, render a useful transport UI.",
  },
  {
    id: "primitives",
    title: "Primitives",
    description:
      "Presentational building blocks that take explicit, already-resolved values.",
  },
  {
    id: "foundations",
    title: "Foundations",
    description:
      "Shared visual language, identity, and licensing — not higher-level boards.",
  },
  {
    id: "maps",
    title: "Maps",
    description:
      "Geographic (real coordinates) and schematic/network (topology) — kept distinct.",
  },
  {
    id: "blocks",
    title: "Blocks",
    description:
      "Composed mini-apps (shadcn-style blocks) that demonstrate Interfaces + Primitives together.",
  },
  {
    id: "tools",
    title: "Tools",
    description:
      "Playgrounds to inspect, test, tune, or debug — not embeddable product UI.",
  },
  {
    id: "drafts",
    title: "Drafts",
    description:
      "Incubation for experimental work until it meets promotion criteria.",
  },
] as const;

export const DOCS_ENTRIES: readonly DocsEntry[] = [
  {
    slug: "introduction",
    title: "Introduction",
    description:
      "Open React components for London transport, copied into your app via the shadcn registry.",
    group: "start",
    kind: "page",
    href: "/",
  },
  {
    slug: "installation",
    title: "Installation",
    description:
      "Add a board with the shadcn CLI, install tfl-ts, and set your TfL API keys.",
    group: "start",
    kind: "page",
    href: "/installation",
  },
  {
    slug: "explore-index",
    title: "Explore overview",
    description:
      "Developer-facing TfL information model and relationships.",
    group: "explore",
    kind: "page",
    href: "/explore",
  },
  {
    slug: "browse-lines",
    title: "Browse lines",
    description: "Lines grouped by mode with links to route stations.",
    group: "explore",
    kind: "page",
    href: "/explore/lines",
  },
  {
    slug: "route-stations",
    title: "Route stations",
    description: "Stop sequence for one line and direction.",
    group: "explore",
    kind: "page",
    href: "/explore/routes",
  },
  {
    slug: "interfaces-index",
    title: "Interfaces overview",
    description:
      "Data-aware embeddable UIs organised by developer intent.",
    group: "interfaces",
    kind: "page",
    href: "/interfaces",
  },
  {
    slug: "tube-status-board",
    title: "Status board",
    description:
      "Tube and rail status from normalised line status data (data as props).",
    group: "interfaces",
    kind: "component",
    href: "/interfaces/tube-status-board",
    registryName: "tube-status-board",
    registryUrl: `${REGISTRY_BASE}/tube-status-board.json`,
    layer: "data-aware",
  },
  {
    slug: "arrivals-board",
    title: "Arrivals",
    description:
      "Unified arrivals board — rail or bus presentation from the same list model.",
    group: "interfaces",
    kind: "component",
    href: "/interfaces/arrivals-board",
    registryName: "arrivals-board",
    registryUrl: `${REGISTRY_BASE}/arrivals-board.json`,
    layer: "data-aware",
  },
  {
    slug: "primitives-index",
    title: "Primitives overview",
    description:
      "Discoverable rendering primitives for fine-grained control.",
    group: "primitives",
    kind: "page",
    href: "/primitives",
  },
  {
    slug: "line-strip",
    title: "Line strip",
    description:
      "Molecular TfL strip — StraightStrip / BranchStrip with label recipes, closures, and journey helpers.",
    group: "primitives",
    kind: "component",
    href: "/primitives/line-strip",
    registryName: "line-strip",
    registryUrl: `${REGISTRY_BASE}/line-strip.json`,
    layer: "primitive",
  },
  {
    slug: "branch-strip",
    title: "Branch strip",
    description:
      "Atomic branched strip — lane×pos schematics with SVG geometry and StationName labels.",
    group: "primitives",
    kind: "component",
    href: "/primitives/branch-strip",
    registryName: "line-strip",
    registryUrl: `${REGISTRY_BASE}/line-strip.json`,
    layer: "primitive",
  },
  {
    slug: "foundations-index",
    title: "Foundations overview",
    description:
      "Colours, typography, identity, roundel, and licensing.",
    group: "foundations",
    kind: "page",
    href: "/foundations",
  },
  {
    slug: "tfl-roundel",
    title: "Roundel",
    description:
      "Env-gated TfL roundel with mode presets and colour customisation.",
    group: "foundations",
    kind: "component",
    href: "/foundations/tfl-roundel",
    registryName: "tfl-roundel",
    registryUrl: `${REGISTRY_BASE}/tfl-roundel.json`,
    layer: "primitive",
  },
  {
    slug: "line-badge",
    title: "Line colours & badges",
    description:
      "Official TfL line colour badges and colour bars with dark-mode outlines.",
    group: "foundations",
    kind: "component",
    href: "/foundations/line-badge",
    registryName: "line-badge",
    registryUrl: `${REGISTRY_BASE}/line-badge.json`,
    layer: "primitive",
  },
  {
    slug: "maps-index",
    title: "Maps overview",
    description:
      "Geographic vs schematic/network — two different map concepts.",
    group: "maps",
    kind: "page",
    href: "/maps",
  },
  {
    slug: "maps-geographic",
    title: "Geographic maps",
    description:
      "MapLibre placeholder over vendored OSM transit geometry — Tube, Elizabeth, Overground, DLR, Tram.",
    group: "maps",
    kind: "page",
    href: "/maps/geographic",
  },
  {
    slug: "maps-schematic",
    title: "Schematic & network",
    description:
      "Topology overview — links to line/branch strip primitives.",
    group: "maps",
    kind: "page",
    href: "/maps/schematic",
  },
  {
    slug: "blocks-index",
    title: "Blocks overview",
    description:
      "Composed mini-apps outside the component catalog.",
    group: "blocks",
    kind: "page",
    href: "/blocks",
  },
  {
    slug: "week-ahead",
    title: "Week ahead",
    description:
      "Block composing status interpretation with schematic line strips.",
    group: "blocks",
    kind: "block",
    href: "/blocks/week-ahead",
  },
  {
    slug: "tools-index",
    title: "Tools overview",
    description:
      "Playgrounds that meet the inspect/test/tune/debug criterion.",
    group: "tools",
    kind: "page",
    href: "/tools",
  },
  {
    slug: "typography",
    title: "Station typography",
    description:
      "A–Z destination labels with deterministic two-line word breaks, measured in Hammersmith One.",
    group: "tools",
    kind: "tool",
    href: "/tools/typography",
  },
  {
    slug: "drafts-index",
    title: "Drafts overview",
    description:
      "Incubation area — experimental work until promotion criteria are met.",
    group: "drafts",
    kind: "page",
    href: "/drafts",
  },
] as const;

export const getDocsEntry = (slug: string): DocsEntry | undefined =>
  DOCS_ENTRIES.find((entry) => entry.slug === slug);

export const getComponentEntries = (): DocsEntry[] =>
  DOCS_ENTRIES.filter((entry) => entry.kind === "component");

export const getToolEntries = (): DocsEntry[] =>
  DOCS_ENTRIES.filter((entry) => entry.kind === "tool");

export const getInstallableEntries = (): DocsEntry[] =>
  DOCS_ENTRIES.filter((entry) => Boolean(entry.registryUrl));

export const getEntriesByGroup = (groupId: DocsGroupId): DocsEntry[] =>
  DOCS_ENTRIES.filter((entry) => entry.group === groupId);

/** Groups that currently have at least one entry (skips empty reserved slots). */
export const getPopulatedGroups = (): DocsGroup[] =>
  DOCS_GROUPS.filter((group) => getEntriesByGroup(group.id).length > 0);

export const getRegistryUrl = (slug: string): string | undefined =>
  getDocsEntry(slug)?.registryUrl;

export const layerBadgeLabel = (
  layer: DocsEntryLayer,
): "Primitive" | "Data-aware" =>
  layer === "primitive" ? "Primitive" : "Data-aware";

export const HOME_CATALOG_GROUPS: readonly DocsGroupId[] = [
  "explore",
  "interfaces",
  "primitives",
  "foundations",
  "maps",
  "blocks",
  "tools",
  "drafts",
] as const;
