/**
 * Single source for docs navigation, search, and static params.
 * Discovery chrome follows J6 — docs/TARGET_ARCHITECTURE.md.
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

/** Component layer for catalogue badges — omit for start / tools / drafts indexes. */
export type DocsEntryLayer = "primitive" | "data-aware" | "map";

/** Docs sidebar section (J6). `hidden` = not in docs sidebar. */
export type DocsSidebarSection =
  | "get-started"
  | "components"
  | "primitives-foundations"
  | "hidden";

/** Mode-coloured preferred marker in the Components sidebar. */
export type DocsModeMarker =
  | "tube-rail"
  | "bus"
  | "river"
  | "cycle"
  | "cable"
  | "map";

export type DocsEntry = {
  slug: string;
  title: string;
  description: string;
  group: DocsGroupId;
  kind: DocsEntryKind;
  /** Route path (absolute from site root). */
  href: string;
  /** Docs sidebar placement. */
  sidebarSection: DocsSidebarSection;
  /** Sort within sidebar section (lower first). */
  sidebarOrder: number;
  /** Preferred high-level embed — show mode marker in sidebar. */
  preferred?: boolean;
  /** Colour the preferred marker by transport / map type. */
  modeMarker?: DocsModeMarker;
  /** Registry item name when installable via shadcn. */
  registryName?: string;
  /** Public registry JSON URL when installable. */
  registryUrl?: string;
  /** Rendering primitive vs data-aware board vs map product. */
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
  /** Coming-soon placeholder — no full docs yet. */
  comingSoon?: boolean;
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
    title: "Get started",
    description: "Introduction, installation, explorer, and brand basics.",
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
  },
  {
    id: "primitives",
    title: "Rendering primitives",
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
      "Composed mini-apps (shadcn-style blocks) that demonstrate components together.",
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

/** Hex colours for sidebar preferred markers (mode pictogram stand-ins). */
export const MODE_MARKER_COLOURS: Record<
  DocsModeMarker,
  { primary: string; secondary?: string; label: string }
> = {
  "tube-rail": {
    primary: "#E1251F",
    secondary: "#0019A8",
    label: "Tube & rail",
  },
  bus: { primary: "#DC241F", label: "Bus" },
  river: { primary: "#00A9E0", label: "River" },
  cycle: { primary: "#00A13A", label: "Cycle" },
  cable: { primary: "#E21836", label: "Cable car" },
  map: { primary: "#0019A8", label: "Map" },
};

/** Old catalogue slugs → current (pages / MDX / registry demos). */
const SLUG_ALIASES: Record<string, string> = {
  "arrivals-board": "tube-rail-arrivals",
  "tube-status-board": "tube-rail-status",
  "station-name": "station-name-labels",
  "station-labels": "station-name-labels",
};

/**
 * Catalogue slug → content/demo filename under content/components and demos/.
 * When omitted, the catalogue slug is used.
 */
const CONTENT_ASSET_SLUGS: Record<string, string> = {
  "tube-rail-arrivals": "arrivals-board",
  "tube-rail-status": "tube-status-board",
  "bus-arrivals": "bus-arrivals-board",
  "station-name-labels": "station-name",
  "line-badge": "line-badge",
};

export const DOCS_ENTRIES: readonly DocsEntry[] = [
  // —— Get started ——
  {
    slug: "introduction",
    title: "Introduction",
    description:
      "Open React components for London transport, copied into your app via the shadcn registry.",
    group: "start",
    kind: "page",
    href: "/docs",
    sidebarSection: "get-started",
    sidebarOrder: 10,
  },
  {
    slug: "components-index",
    title: "Components",
    description:
      "Catalogue of embeddable TfL surfaces — preferred boards first, then rendering parts.",
    group: "start",
    kind: "page",
    href: "/docs/components",
    sidebarSection: "get-started",
    sidebarOrder: 20,
  },
  {
    slug: "installation",
    title: "Installation",
    description:
      "Add a board with the shadcn CLI, install tfl-ts, and set your TfL API keys.",
    group: "start",
    kind: "page",
    href: "/docs/installation",
    sidebarSection: "get-started",
    sidebarOrder: 30,
  },
  {
    slug: "explore-index",
    title: "Explorer",
    description:
      "Developer-facing TfL information model and relationships (WIP).",
    group: "explore",
    kind: "page",
    href: "/docs/explorer",
    sidebarSection: "get-started",
    sidebarOrder: 40,
  },
  {
    slug: "typography",
    title: "Typography",
    description:
      "Safe defaults for type — licensed Johnston / TfL Go vs open alternatives.",
    group: "foundations",
    kind: "page",
    href: "/docs/typography",
    sidebarSection: "get-started",
    sidebarOrder: 50,
  },
  {
    slug: "line-badge",
    title: "Colours",
    description:
      "Official TfL line colours, OKLCH tokens, and adaptive data-line roles.",
    group: "foundations",
    kind: "component",
    href: "/docs/colors",
    sidebarSection: "get-started",
    sidebarOrder: 60,
    registryName: "line-badge",
    registryUrl: `${REGISTRY_BASE}/line-badge.json`,
    layer: "primitive",
  },
  {
    slug: "tfl-roundel",
    title: "Roundel",
    description:
      "Env-gated TfL roundel with mode presets and colour customisation.",
    group: "foundations",
    kind: "component",
    href: "/docs/tfl-roundel",
    sidebarSection: "get-started",
    sidebarOrder: 70,
    registryName: "tfl-roundel",
    registryUrl: `${REGISTRY_BASE}/tfl-roundel.json`,
    layer: "primitive",
  },
  {
    slug: "licensing",
    title: "TfL brand licensing",
    description:
      "What installing a component does and does not grant for TfL brand assets.",
    group: "foundations",
    kind: "page",
    href: "/docs/tfl-licensing",
    sidebarSection: "get-started",
    sidebarOrder: 200,
  },
  {
    slug: "skills-for-ai",
    title: "Skills for AI",
    description:
      "Agent-oriented guidance for installing and composing tfl-components.",
    group: "start",
    kind: "placeholder",
    href: "/docs/skills",
    sidebarSection: "get-started",
    sidebarOrder: 210,
    comingSoon: true,
  },

  // —— Components (preferred + rendering parts) ——
  {
    slug: "tube-rail-arrivals",
    title: "Tube & Rail Arrivals",
    description:
      "Per-station departures for Tube and rail from tfl-ts predictions.",
    group: "interfaces",
    kind: "component",
    href: "/docs/tube-rail-arrivals",
    sidebarSection: "components",
    sidebarOrder: 10,
    preferred: true,
    modeMarker: "tube-rail",
    registryName: "arrivals-board",
    registryUrl: `${REGISTRY_BASE}/arrivals-board.json`,
    layer: "data-aware",
    builtWith: ["platform-chip", "station-name-labels"],
    usesFoundations: ["line-badge", "tfl-roundel"],
  },
  {
    slug: "tube-rail-status",
    title: "Tube & Rail Status",
    description:
      "Network and per-station Tube/rail status from normalised line status data.",
    group: "interfaces",
    kind: "component",
    href: "/docs/tube-rail-status",
    sidebarSection: "components",
    sidebarOrder: 20,
    preferred: true,
    modeMarker: "tube-rail",
    registryName: "tube-status-board",
    registryUrl: `${REGISTRY_BASE}/tube-status-board.json`,
    layer: "data-aware",
    usesFoundations: ["line-badge", "tfl-roundel"],
  },
  {
    slug: "bus-arrivals",
    title: "Bus Arrivals",
    description: "Bus stop departures board from normalised predictions.",
    group: "interfaces",
    kind: "component",
    href: "/docs/bus-arrivals",
    sidebarSection: "components",
    sidebarOrder: 30,
    preferred: true,
    modeMarker: "bus",
    registryName: "arrivals-board",
    registryUrl: `${REGISTRY_BASE}/arrivals-board.json`,
    layer: "data-aware",
    builtWith: ["bus-number-chip", "station-name-labels"],
    usesFoundations: ["line-badge", "tfl-roundel"],
  },
  {
    slug: "river-bus-arrivals",
    title: "River bus arrivals",
    description: "River bus pier departures — coming soon.",
    group: "interfaces",
    kind: "placeholder",
    href: "/docs/river-bus-arrivals",
    sidebarSection: "components",
    sidebarOrder: 40,
    preferred: true,
    modeMarker: "river",
    comingSoon: true,
  },
  {
    slug: "cycle-hire-docks",
    title: "Cycle hire docks",
    description:
      "Santander Cycles Map + Detail surfaces — OSM gauges and occupancy bars over tfl-ts bike points.",
    group: "interfaces",
    kind: "component",
    href: "/docs/cycle-hire-docks",
    sidebarSection: "components",
    sidebarOrder: 50,
    preferred: true,
    modeMarker: "cycle",
    registryName: "cycle-hire-docks",
    registryUrl: `${REGISTRY_BASE}/cycle-hire-docks.json`,
    layer: "data-aware",
    usesFoundations: ["tfl-roundel"],
  },
  {
    slug: "maps-geographic",
    title: "Map (Geographic)",
    description:
      "Provider-independent GeoJSON geometry with a MapLibre demo adapter.",
    group: "maps",
    kind: "component",
    href: "/docs/map-geographic",
    sidebarSection: "components",
    sidebarOrder: 70,
    preferred: true,
    modeMarker: "map",
    layer: "map",
  },
  {
    slug: "map-tubemap",
    title: "Map (TubeMap)",
    description: "Schematic Tube-style network map — coming soon.",
    group: "maps",
    kind: "placeholder",
    href: "/docs/map-tubemap",
    sidebarSection: "components",
    sidebarOrder: 80,
    preferred: true,
    modeMarker: "map",
    layer: "map",
    comingSoon: true,
  },
  {
    slug: "line-strip",
    title: "Simple Line strip",
    description:
      "Data-aware molecular strip — colour, labels, closures → StraightStrip / BranchStrip.",
    group: "interfaces",
    kind: "component",
    href: "/docs/line-strip",
    sidebarSection: "components",
    sidebarOrder: 90,
    registryName: "line-strip",
    registryUrl: `${REGISTRY_BASE}/line-strip.json`,
    layer: "data-aware",
    builtWith: ["branch-strip", "station-name-labels"],
    usesFoundations: ["line-badge"],
  },
  {
    slug: "branch-strip",
    title: "Branch line strip",
    description:
      "Atomic branched strip — lane×pos schematics with SVG geometry and station labels.",
    group: "primitives",
    kind: "component",
    href: "/docs/branch-strip",
    sidebarSection: "components",
    sidebarOrder: 100,
    registryName: "line-strip",
    registryUrl: `${REGISTRY_BASE}/line-strip.json`,
    layer: "primitive",
    builtWith: ["station-name-labels"],
    usesFoundations: ["line-badge"],
  },
  {
    slug: "station-name-labels",
    title: "Station name labels",
    description:
      "TfL-aware station labels with width fitting, accessibility, and find-in-page behaviour.",
    group: "primitives",
    kind: "component",
    href: "/docs/station-name-labels",
    sidebarSection: "components",
    sidebarOrder: 110,
    layer: "primitive",
  },
  {
    slug: "platform-chip",
    title: "Platform chip",
    description:
      "Rail platform label in a muted rectangle — title case with cap text-box trim for centering.",
    group: "primitives",
    kind: "component",
    href: "/docs/platform-chip",
    sidebarSection: "components",
    sidebarOrder: 120,
    registryName: "platform-chip",
    registryUrl: `${REGISTRY_BASE}/platform-chip.json`,
    layer: "primitive",
  },
  {
    slug: "bus-number-chip",
    title: "Bus number chip",
    description:
      "Bus route-number rectangle — bus red, fixed width, cap text-box trim for centering.",
    group: "primitives",
    kind: "component",
    href: "/docs/bus-number-chip",
    sidebarSection: "components",
    sidebarOrder: 130,
    registryName: "bus-number-chip",
    registryUrl: `${REGISTRY_BASE}/bus-number-chip.json`,
    layer: "primitive",
  },

  // —— Primitives & Foundations tail ——
  {
    slug: "icons",
    title: "Icons & pictograms",
    description:
      "Mode pictograms and diagram markers — what ships safely vs protected marks.",
    group: "foundations",
    kind: "page",
    href: "/docs/icons",
    sidebarSection: "primitives-foundations",
    sidebarOrder: 10,
  },

  // —— Hidden from docs sidebar (search / redirects / Blocks / Tools / Explorer children) ——
  {
    slug: "browse-lines",
    title: "Browse lines",
    description: "Lines grouped by mode with links to route stations.",
    group: "explore",
    kind: "page",
    href: "/explore/lines",
    sidebarSection: "hidden",
    sidebarOrder: 0,
  },
  {
    slug: "route-stations",
    title: "Route stations",
    description: "Stop sequence for one line and direction.",
    group: "explore",
    kind: "page",
    href: "/explore/routes",
    sidebarSection: "hidden",
    sidebarOrder: 0,
  },
  {
    slug: "bus-stops",
    title: "Bus stops",
    description:
      "Find bus stops near you or by name, then inspect live arrivals.",
    group: "explore",
    kind: "page",
    href: "/explore/bus-stops",
    sidebarSection: "hidden",
    sidebarOrder: 0,
  },
  {
    slug: "maps-schematic",
    title: "Schematic & network",
    description:
      "Topology: line diagrams, branches, journeys, and multi-line networks.",
    group: "maps",
    kind: "page",
    href: "/docs/map-schematic",
    sidebarSection: "hidden",
    sidebarOrder: 0,
    layer: "map",
  },
  {
    slug: "blocks-index",
    title: "Blocks",
    description: "Composed mini-apps outside the component catalog.",
    group: "blocks",
    kind: "page",
    href: "/blocks",
    sidebarSection: "hidden",
    sidebarOrder: 0,
  },
  {
    slug: "week-ahead",
    title: "Week ahead",
    description:
      "Block composing status interpretation with schematic line strips.",
    group: "blocks",
    kind: "block",
    href: "/blocks/week-ahead",
    sidebarSection: "hidden",
    sidebarOrder: 0,
    builtWith: ["line-strip", "branch-strip", "station-name-labels"],
    usesFoundations: ["line-badge"],
  },
  {
    slug: "tools-index",
    title: "Tools",
    description:
      "Playgrounds that meet the inspect/test/tune/debug criterion.",
    group: "tools",
    kind: "page",
    href: "/tools",
    sidebarSection: "hidden",
    sidebarOrder: 0,
  },
  {
    slug: "station-typography",
    title: "Station typography",
    description:
      "Playground for A–Z destination labels — tunes StationName behaviour.",
    group: "tools",
    kind: "tool",
    href: "/tools/typography",
    sidebarSection: "hidden",
    sidebarOrder: 0,
    builtWith: ["station-name-labels"],
  },
  {
    slug: "drafts-index",
    title: "Drafts",
    description:
      "Incubation area — experimental work until promotion criteria are met.",
    group: "drafts",
    kind: "page",
    href: "/drafts",
    sidebarSection: "hidden",
    sidebarOrder: 0,
    excludeFromInstallLists: true,
  },
] as const;

export const resolveDocsSlug = (slug: string): string =>
  SLUG_ALIASES[slug] ?? slug;

/** Filename stem for MDX + demo loaders. */
export const getContentAssetSlug = (slug: string): string => {
  const resolved = resolveDocsSlug(slug);
  return CONTENT_ASSET_SLUGS[resolved] ?? resolved;
};

export const getDocsEntry = (slug: string): DocsEntry | undefined => {
  const resolved = resolveDocsSlug(slug);
  return DOCS_ENTRIES.find((entry) => entry.slug === resolved);
};

export const getComponentEntries = (): DocsEntry[] =>
  DOCS_ENTRIES.filter(
    (entry) =>
      entry.kind === "component" ||
      (entry.kind === "placeholder" && entry.sidebarSection === "components"),
  );

export const getToolEntries = (): DocsEntry[] =>
  DOCS_ENTRIES.filter((entry) => entry.kind === "tool");

export const getInstallableEntries = (): DocsEntry[] => {
  const seen = new Set<string>();
  return DOCS_ENTRIES.filter((entry) => {
    if (!entry.registryUrl || entry.excludeFromInstallLists) return false;
    const key = entry.registryUrl;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const getEntriesByGroup = (groupId: DocsGroupId): DocsEntry[] =>
  DOCS_ENTRIES.filter((entry) => entry.group === groupId);

export const getSidebarEntries = (
  section: Exclude<DocsSidebarSection, "hidden">,
): DocsEntry[] =>
  DOCS_ENTRIES.filter((entry) => entry.sidebarSection === section).sort(
    (a, b) => a.sidebarOrder - b.sidebarOrder,
  );

/** Matches DocsSidebar: get-started top → components → get-started bottom → primitives & foundations. */
const GET_STARTED_BOTTOM_FROM = 200;

export const getFlatSidebarOrder = (): DocsEntry[] => {
  const getStarted = getSidebarEntries("get-started");
  const getStartedTop = getStarted.filter(
    (entry) => entry.sidebarOrder < GET_STARTED_BOTTOM_FROM,
  );
  const getStartedBottom = getStarted.filter(
    (entry) => entry.sidebarOrder >= GET_STARTED_BOTTOM_FROM,
  );
  return [
    ...getStartedTop,
    ...getSidebarEntries("components"),
    ...getStartedBottom,
    ...getSidebarEntries("primitives-foundations"),
  ];
};

export const getAdjacentEntries = (
  slug: string,
): { prev: DocsEntry | null; next: DocsEntry | null } => {
  const order = getFlatSidebarOrder();
  const resolved = resolveDocsSlug(slug);
  const index = order.findIndex((entry) => entry.slug === resolved);
  if (index < 0) return { prev: null, next: null };
  return {
    prev: index > 0 ? order[index - 1]! : null,
    next: index < order.length - 1 ? order[index + 1]! : null,
  };
};

/** Groups that currently have at least one entry (skips empty reserved slots). */
export const getPopulatedGroups = (): DocsGroup[] =>
  DOCS_GROUPS.filter((group) => getEntriesByGroup(group.id).length > 0);

export const getRegistryUrl = (slug: string): string | undefined =>
  getDocsEntry(slug)?.registryUrl;

export const layerBadgeLabel = (
  layer: DocsEntryLayer,
): "Primitive" | "Data-aware" | "Map" => {
  if (layer === "primitive") return "Primitive";
  if (layer === "map") return "Map";
  return "Data-aware";
};

/** Single hero badge — layer when present, otherwise kind. */
export const entryBadgeLabel = (entry: DocsEntry): string | null => {
  if (entry.layer) return layerBadgeLabel(entry.layer);
  if (entry.kind === "tool") return "Tool";
  if (entry.kind === "block") return "Block";
  if (entry.kind === "draft") return "Draft";
  if (entry.kind === "placeholder") return "Coming soon";
  return null;
};

/** Reverse relationships: which public surfaces list this slug in builtWith / usesFoundations. */
export const getUsedBySlugs = (slug: string): string[] =>
  DOCS_ENTRIES.filter(
    (entry) =>
      entry.builtWith?.includes(slug) ||
      entry.usesFoundations?.includes(slug),
  ).map((entry) => entry.slug);

/** Catalogue rows for `/docs/components` (preferred + rendering parts). */
export const getCatalogueEntries = (): DocsEntry[] =>
  getSidebarEntries("components");

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
