/**
 * Single source for docs navigation, home catalog, and static params.
 * Groups follow frozen Stage 1 IA — docs/TARGET_ARCHITECTURE.md.
 * Existing page routes stay put until bulk migration; catalog group ids
 * already reflect target homes where classification is clear.
 */

export type DocsGroupId =
  | "start"
  | "explore"
  | "interfaces"
  | "primitives"
  | "foundations"
  | "maps"
  | "tools"
  | "drafts";

export type DocsEntryKind =
  | "page"
  | "component"
  | "tool"
  | "placeholder"
  | "draft";

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
      "Data-aware components: get normalised data, render a useful transport UI.",
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
  // —— Start ——
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

  // —— Explore ——
  {
    slug: "explore-index",
    title: "Explore overview",
    description:
      "Placeholder: developer-facing TfL information model and relationships.",
    group: "explore",
    kind: "placeholder",
    href: "/explore",
  },
  {
    slug: "browse-lines",
    title: "Browse lines",
    description: "Lines grouped by mode with links to route stations.",
    group: "explore",
    kind: "tool",
    href: "/tools/browse-lines",
  },
  {
    slug: "route-stations",
    title: "Route stations",
    description: "Stop sequence for one line and direction.",
    group: "explore",
    kind: "tool",
    href: "/tools/route-stations",
  },

  // —— Interfaces (data-aware; routes unchanged until migration) ——
  {
    slug: "interfaces-index",
    title: "Interfaces overview",
    description:
      "Placeholder: data-aware embeddable UIs organised by developer intent.",
    group: "interfaces",
    kind: "placeholder",
    href: "/interfaces",
  },
  {
    slug: "tube-status-board",
    title: "Status board",
    description:
      "Live tube and rail status with severity sorting and official line colours.",
    group: "interfaces",
    kind: "component",
    href: "/components/tube-status-board",
    registryName: "tube-status-board",
    registryUrl: `${REGISTRY_BASE}/tube-status-board.json`,
    layer: "data-aware",
  },
  {
    slug: "live-arrivals-board",
    title: "Live arrivals",
    description: "Polling stop arrivals board for tube and rail stations.",
    group: "interfaces",
    kind: "component",
    href: "/components/live-arrivals-board",
    registryName: "live-arrivals-board",
    registryUrl: `${REGISTRY_BASE}/live-arrivals-board.json`,
    layer: "data-aware",
  },
  {
    slug: "bus-arrivals-board",
    title: "Bus arrivals",
    description:
      "Nearby bus stops and live arrivals with route-number chips.",
    group: "interfaces",
    kind: "component",
    href: "/components/bus-arrivals-board",
    registryName: "bus-arrivals-board",
    registryUrl: `${REGISTRY_BASE}/bus-arrivals-board.json`,
    layer: "data-aware",
  },

  // —— Primitives ——
  {
    slug: "primitives-index",
    title: "Primitives overview",
    description:
      "Placeholder: discoverable rendering primitives for fine-grained control.",
    group: "primitives",
    kind: "placeholder",
    href: "/primitives",
  },
  {
    slug: "line-strip",
    title: "Line strip",
    description:
      "Molecular TfL strip — StraightStrip / BranchStrip with label recipes, closures, and journey helpers.",
    group: "primitives",
    kind: "component",
    href: "/components/line-strip",
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
    href: "/components/branch-strip",
    registryName: "line-strip",
    registryUrl: `${REGISTRY_BASE}/line-strip.json`,
    layer: "primitive",
  },

  // —— Foundations ——
  {
    slug: "foundations-index",
    title: "Foundations overview",
    description:
      "Placeholder: colours, typography, identity, roundel, and licensing.",
    group: "foundations",
    kind: "placeholder",
    href: "/foundations",
  },
  {
    slug: "tfl-roundel",
    title: "Roundel",
    description:
      "Env-gated TfL roundel with mode presets and colour customisation.",
    group: "foundations",
    kind: "component",
    href: "/components/tfl-roundel",
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
    href: "/components/line-badge",
    registryName: "line-badge",
    registryUrl: `${REGISTRY_BASE}/line-badge.json`,
    layer: "primitive",
  },

  // —— Maps ——
  {
    slug: "maps-index",
    title: "Maps overview",
    description:
      "Placeholder: geographic vs schematic/network — two different map concepts.",
    group: "maps",
    kind: "placeholder",
    href: "/maps",
  },
  {
    slug: "maps-geographic",
    title: "Geographic maps",
    description:
      "Placeholder: real coordinates, GeoJSON, provider-independent geography.",
    group: "maps",
    kind: "placeholder",
    href: "/maps/geographic",
  },
  {
    slug: "maps-schematic",
    title: "Schematic & network",
    description:
      "Placeholder: topology, line diagrams, branches, interchanges.",
    group: "maps",
    kind: "placeholder",
    href: "/maps/schematic",
  },

  // —— Tools ——
  {
    slug: "tools-index",
    title: "Tools overview",
    description:
      "Placeholder: playgrounds that meet the inspect/test/tune/debug criterion.",
    group: "tools",
    kind: "placeholder",
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

  // —— Drafts ——
  {
    slug: "drafts-index",
    title: "Drafts overview",
    description:
      "Placeholder: incubation area — experimental work until promotion criteria are met.",
    group: "drafts",
    kind: "placeholder",
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

/** Home catalog: skip Start (covered by intro) and pure placeholder-only noise if desired. */
export const HOME_CATALOG_GROUPS: readonly DocsGroupId[] = [
  "explore",
  "interfaces",
  "primitives",
  "foundations",
  "maps",
  "tools",
  "drafts",
] as const;
