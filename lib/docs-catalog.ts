/**
 * Single source for docs navigation, home catalog, search, and static params.
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
  /**
   * Related catalogue slugs this surface composes (primitives / other boards).
   * Rendered as “Built with” badges.
   */
  builtWith?: readonly string[];
  /** Foundation slugs this surface uses. */
  usesFoundations?: readonly string[];
  /**
   * When true, omit from standard install tables (Drafts / legacy helpers).
   */
  excludeFromInstallLists?: boolean;
};

export type DocsGroup = {
  id: DocsGroupId;
  title: string;
  description: string;
  /** Optional sidebar section parent label (e.g. Components). */
  navSection?: string;
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
    title: "Explorer",
    description:
      "What TfL knows and how that information relates — not a Unified API endpoint list.",
  },
  {
    id: "interfaces",
    title: "Data-aware",
    description:
      "Data-aware components: pass normalised data as props, render a useful transport UI.",
    navSection: "Components",
  },
  {
    id: "primitives",
    title: "Rendering primitives",
    description:
      "Presentational building blocks that take explicit, already-resolved values.",
    navSection: "Components",
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
    title: "Explorer overview",
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
    title: "Data-aware overview",
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
    usesFoundations: ["line-badge", "tfl-roundel"],
  },
  {
    slug: "arrivals-board",
    title: "Arrivals",
    description:
      "Per-station departures grouped by line and compass bound from tfl-ts predictions.",
    group: "interfaces",
    kind: "component",
    href: "/interfaces/arrivals-board",
    registryName: "arrivals-board",
    registryUrl: `${REGISTRY_BASE}/arrivals-board.json`,
    layer: "data-aware",
    usesFoundations: ["line-badge"],
  },
  {
    slug: "line-strip",
    title: "Line strip",
    description:
      "Data-aware molecular strip — colour, labels, closures → StraightStrip / BranchStrip.",
    group: "interfaces",
    kind: "component",
    href: "/interfaces/line-strip",
    registryName: "line-strip",
    registryUrl: `${REGISTRY_BASE}/line-strip.json`,
    layer: "data-aware",
    builtWith: ["branch-strip", "station-name"],
    usesFoundations: ["line-badge"],
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
    builtWith: ["station-name"],
    usesFoundations: ["line-badge"],
  },
  {
    slug: "station-name",
    title: "Station name",
    description:
      "TfL-aware station label rendering with deterministic line breaks and abbreviation.",
    group: "primitives",
    kind: "component",
    href: "/primitives/station-name",
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
    slug: "typography",
    title: "Typography",
    description:
      "Safe defaults for type — licensed Johnston / TfL Go vs open alternatives.",
    group: "foundations",
    kind: "page",
    href: "/foundations/typography",
  },
  {
    slug: "station-labels",
    title: "Station labels",
    description:
      "How names and platforms shrink with width while copy, find, and screen readers keep the full name.",
    group: "foundations",
    kind: "page",
    href: "/foundations/station-labels",
    builtWith: ["station-name"],
  },
  {
    slug: "icons",
    title: "Icons & pictograms",
    description:
      "Mode pictograms and diagram markers — what ships safely vs protected marks.",
    group: "foundations",
    kind: "page",
    href: "/foundations/icons",
  },
  {
    slug: "licensing",
    title: "Licensing & brand use",
    description:
      "What installing a component does and does not grant for TfL brand assets.",
    group: "foundations",
    kind: "page",
    href: "/foundations/licensing",
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
      "Provider-independent GeoJSON geometry with a MapLibre demo adapter.",
    group: "maps",
    kind: "page",
    href: "/maps/geographic",
  },
  {
    slug: "maps-schematic",
    title: "Schematic & network",
    description:
      "Topology: line diagrams, branches, journeys, and multi-line networks.",
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
    builtWith: ["line-strip", "branch-strip", "station-name"],
    usesFoundations: ["line-badge"],
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
    slug: "station-typography",
    title: "Station typography",
    description:
      "Playground for A–Z destination labels — tunes StationName behaviour.",
    group: "tools",
    kind: "tool",
    href: "/tools/typography",
    builtWith: ["station-name"],
  },
  {
    slug: "drafts-index",
    title: "Drafts overview",
    description:
      "Incubation area — experimental work until promotion criteria are met.",
    group: "drafts",
    kind: "page",
    href: "/drafts",
    excludeFromInstallLists: true,
  },
] as const;

export const getDocsEntry = (slug: string): DocsEntry | undefined =>
  DOCS_ENTRIES.find((entry) => entry.slug === slug);

export const getComponentEntries = (): DocsEntry[] =>
  DOCS_ENTRIES.filter((entry) => entry.kind === "component");

export const getToolEntries = (): DocsEntry[] =>
  DOCS_ENTRIES.filter((entry) => entry.kind === "tool");

export const getInstallableEntries = (): DocsEntry[] =>
  DOCS_ENTRIES.filter(
    (entry) =>
      Boolean(entry.registryUrl) && !entry.excludeFromInstallLists,
  );

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

/** Reverse relationships: which public surfaces list this slug in builtWith / usesFoundations. */
export const getUsedBySlugs = (slug: string): string[] =>
  DOCS_ENTRIES.filter(
    (entry) =>
      entry.builtWith?.includes(slug) ||
      entry.usesFoundations?.includes(slug),
  ).map((entry) => entry.slug);

export const HOME_CATALOG_GROUPS: readonly DocsGroupId[] = [
  "interfaces",
  "primitives",
  "foundations",
  "maps",
  "blocks",
  "tools",
  "explore",
  "drafts",
] as const;
