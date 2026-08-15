/**
 * Single source for docs navigation, search, and static params.
 * Discovery chrome follows J6 / J8 / J9 — docs/TARGET_ARCHITECTURE.md.
 */

import { REGISTRY_BASE } from "@/lib/site";

export type DocsGroupId =
  | "start"
  | "explore"
  | "interfaces"
  | "primitives"
  | "foundations"
  | "maps"
  | "blocks"
  | "board"
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

export const DOCS_GROUPS: readonly DocsGroup[] = [
  {
    id: "start",
    title: "Get started",
    description: "Introduction, explorer, brand basics, and troubleshoot.",
  },
  {
    id: "explore",
    title: "Explorer",
    description:
      "What TfL knows and how stations, stops, docks, and lines relate.",
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
    id: "board",
    title: "Board",
    description:
      "A full-screen board from a URL, running on your TfL key, with nothing to deploy.",
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
  "rail-arrivals-board": "tube-rail-arrivals",
  "bus-arrivals-board": "bus-arrivals",
  "tube-status-board": "tube-rail-status",
  "station-name": "station-name-labels",
  "station-labels": "station-name-labels",
  "line-name": "line-title",
  "line-name-labels": "line-title",
  "line-badge": "line-chip",
  colors: "colours",
};

/**
 * Catalogue slug → content/demo filename under content/components and demos/.
 * When omitted, the catalogue slug is used.
 */
const CONTENT_ASSET_SLUGS: Record<string, string> = {
  "tube-rail-arrivals": "rail-arrivals-board",
  "tube-rail-status": "tube-status-board",
  "bus-arrivals": "bus-arrivals-board",
  "station-name-labels": "station-name",
  "line-title": "line-name",
  "line-chip": "line-badge",
};

export const DOCS_ENTRIES: readonly DocsEntry[] = [
  // —— Get started ——
  {
    slug: "introduction",
    title: "Introduction",
    description:
      "Web components for your TfL projects. Use them with tfl-ts for live data, or alone for the look.",
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
      "Preferred boards first, then the parts they are built from.",
    group: "start",
    kind: "page",
    href: "/docs/components",
    sidebarSection: "get-started",
    sidebarOrder: 20,
  },
  {
    slug: "explore-index",
    title: "Explorer",
    description:
      "Open a Point or Line from a cached example, then search live with your own TfL key.",
    group: "explore",
    kind: "page",
    href: "/docs/explorer",
    sidebarSection: "get-started",
    sidebarOrder: 30,
  },
  {
    slug: "typography",
    title: "Typography",
    description:
      "TfL uses licensed Johnston. Compare Hammersmith One and P22 Underground for web interfaces.",
    group: "foundations",
    kind: "page",
    href: "/docs/typography",
    sidebarSection: "get-started",
    sidebarOrder: 50,
  },
  {
    slug: "colours",
    title: "Colours",
    description:
      "Official TfL line and mode colours — install tokens, map line ids, copy HEX or OKLCH.",
    group: "foundations",
    kind: "page",
    href: "/docs/colors",
    sidebarSection: "get-started",
    sidebarOrder: 60,
    registryName: "tfl-colours",
    registryUrl: `${REGISTRY_BASE}/tfl-colours.json`,
  },
  {
    slug: "tfl-roundel",
    title: "Roundel",
    description:
      "TfL roundel with mode presets. Official artwork stays off until you allow it.",
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
    slug: "installation",
    title: "Troubleshoot",
    description:
      "CLI details, files on disk, and what to check when a component install does not look right.",
    group: "start",
    kind: "page",
    href: "/docs/installation",
    sidebarSection: "get-started",
    sidebarOrder: 190,
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
      "Departures at a Tube or rail station, grouped by line and bound.",
    group: "interfaces",
    kind: "component",
    href: "/docs/tube-rail-arrivals",
    sidebarSection: "components",
    sidebarOrder: 10,
    preferred: true,
    modeMarker: "tube-rail",
    registryName: "rail-arrivals-board",
    registryUrl: `${REGISTRY_BASE}/rail-arrivals-board.json`,
    layer: "data-aware",
    builtWith: ["platform-chip", "station-name-labels", "line-chip"],
    usesFoundations: ["colours", "tfl-roundel"],
  },
  {
    slug: "tube-rail-status",
    title: "Tube & Rail Status",
    description:
      "Severity-sorted status for Tube, Elizabeth, Overground, DLR, and Tram.",
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
    builtWith: ["line-title", "line-chip"],
    usesFoundations: ["colours", "tfl-roundel"],
  },
  {
    slug: "bus-arrivals",    title: "Bus Arrivals",
    description:
      "Departures at a bus stop. Flat by default, or grouped by route.",
    group: "interfaces",
    kind: "component",
    href: "/docs/bus-arrivals",
    sidebarSection: "components",
    sidebarOrder: 30,
    preferred: true,
    modeMarker: "bus",
    registryName: "bus-arrivals-board",
    registryUrl: `${REGISTRY_BASE}/bus-arrivals-board.json`,
    layer: "data-aware",
    builtWith: ["bus-number-chip", "station-name-labels"],
    usesFoundations: ["colours", "tfl-roundel"],
  },
  {
    slug: "bus-disruptions",
    title: "Bus disruption information",
    description:
      "Route-level disruption summaries for use with or without a bus arrivals board. Component boundary still under design.",
    group: "interfaces",
    kind: "placeholder",
    href: "/docs/bus-disruptions",
    sidebarSection: "components",
    sidebarOrder: 35,
    preferred: true,
    modeMarker: "bus",
    layer: "data-aware",
    comingSoon: true,
  },
  {
    slug: "river-bus-arrivals",
    title: "River bus arrivals",
    description: "River bus pier departures. Coming soon.",
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
      "Santander Cycles docks as a map and a detail list, from the same bike-point rows.",
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
      "Track geometry as GeoJSON for Tube, Elizabeth, Overground, DLR, and Tram. Use the packaged MapLibre map, or draw the same files in your own SDK.",
    group: "maps",
    kind: "component",
    href: "/docs/map-geographic",
    sidebarSection: "components",
    sidebarOrder: 70,
    preferred: true,
    modeMarker: "map",
    registryName: "tfl-geographic-map",
    registryUrl: `${REGISTRY_BASE}/tfl-geographic-map.json`,
    layer: "map",
    usesFoundations: ["colours"],
  },
  {
    slug: "map-tubemap",
    title: "Map (TubeMap)",
    description: "Schematic Tube-style network map. Coming soon.",
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
    title: "Simple line strip",
    description:
      "A line diagram from route data: colour, labels, and closures already applied.",
    group: "interfaces",
    kind: "component",
    href: "/docs/line-strip",
    sidebarSection: "components",
    sidebarOrder: 90,
    registryName: "line-strip",
    registryUrl: `${REGISTRY_BASE}/line-strip.json`,
    layer: "data-aware",
    builtWith: ["branch-strip", "station-name-labels", "line-chip"],
    usesFoundations: ["colours"],
  },
  {
    slug: "branch-strip",
    title: "Branch line strip",
    description:
      "A branched schematic with an explicit colour and a prepared lane model.",
    group: "primitives",
    kind: "component",
    href: "/docs/branch-strip",
    sidebarSection: "components",
    sidebarOrder: 100,
    registryName: "line-strip",
    registryUrl: `${REGISTRY_BASE}/line-strip.json`,
    layer: "primitive",
    builtWith: ["station-name-labels"],
    usesFoundations: ["colours"],
  },
  {
    slug: "station-name-labels",
    title: "Station name labels",
    description:
      "How station names and platform chips shrink with width while copy, find, and screen readers keep the full name.",
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
      "Rail platform label in a muted rectangle. Narrows from Platform 4 to 4.",
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
      "Bus route number in a red rectangle. Fixed width, optically centred.",
    group: "primitives",
    kind: "component",
    href: "/docs/bus-number-chip",
    sidebarSection: "components",
    sidebarOrder: 130,
    registryName: "bus-number-chip",
    registryUrl: `${REGISTRY_BASE}/bus-number-chip.json`,
    layer: "primitive",
  },
  {
    slug: "line-title",
    title: "Line title",
    description:
      "Board group headers that step full → H&C / W&C → 3-letter codes as width shrinks.",
    group: "primitives",
    kind: "component",
    href: "/docs/line-title",
    sidebarSection: "components",
    sidebarOrder: 135,
    registryName: "line-badge",
    registryUrl: `${REGISTRY_BASE}/line-badge.json`,
    layer: "primitive",
    usesFoundations: ["colours"],
  },
  {
    slug: "line-chip",
    title: "Line chip",
    description:
      "Filled chips and colour bars that paint official line colours from Colours tokens.",
    group: "primitives",
    kind: "component",
    href: "/docs/line-chip",
    sidebarSection: "components",
    sidebarOrder: 140,
    registryName: "line-badge",
    registryUrl: `${REGISTRY_BASE}/line-badge.json`,
    layer: "primitive",
    builtWith: ["line-title"],
    usesFoundations: ["colours"],
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
    href: "/docs/explorer?kind=lines&domain=tube-rail",
    sidebarSection: "hidden",
    sidebarOrder: 0,
  },
  {
    slug: "route-stations",
    title: "Route stations",
    description: "Stop sequence for one line and direction.",
    group: "explore",
    kind: "page",
    href: "/docs/explorer?kind=lines&domain=tube-rail&id=central",
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
    href: "/docs/explorer?domain=bus",
    sidebarSection: "hidden",
    sidebarOrder: 0,
  },
  {
    slug: "maps-schematic",
    title: "Schematic & network",
    description:
      "Line diagrams, branches, and journeys. Topology, not geography. A full multi-line network map is not shipped yet.",
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
    builtWith: ["line-strip", "branch-strip", "station-name-labels", "line-chip"],
    usesFoundations: ["colours"],
  },
  {
    slug: "board-index",
    title: "Board",
    description:
      "An experimental full-screen TfL display configured through one URL.",
    group: "board",
    kind: "page",
    href: "/board",
    sidebarSection: "hidden",
    sidebarOrder: 0,
    builtWith: ["tube-rail-status", "tube-rail-arrivals"],
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
    slug: "hero-3d",
    title: "3D hero prototype",
    description:
      "Experimental domestic interior for a future landing-page wall display.",
    group: "drafts",
    kind: "draft",
    href: "/drafts/hero-3d",
    sidebarSection: "hidden",
    sidebarOrder: 1,
    excludeFromInstallLists: true,
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
      !entry.comingSoon &&
      (entry.kind === "component" ||
        (entry.kind === "placeholder" && entry.sidebarSection === "components")),
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
  DOCS_ENTRIES.filter(
    (entry) => entry.sidebarSection === section && !entry.comingSoon,
  ).sort((a, b) => a.sidebarOrder - b.sidebarOrder);

/** Catalogue rows include named future surfaces; the persistent sidebar does not. */
export const getCatalogueEntries = (): DocsEntry[] =>
  DOCS_ENTRIES.filter(
    (entry) => entry.sidebarSection === "components",
  ).sort((a, b) => a.sidebarOrder - b.sidebarOrder);

/** Matches DocsSidebar: get-started top → components → Troubleshoot / licensing tail → primitives. */
export const GET_STARTED_BOTTOM_FROM = 190;

/** Tools and Drafts — footer / search in development only (J8). */
export const isInternalDocsEntry = (entry: DocsEntry): boolean =>
  entry.group === "tools" || entry.group === "drafts";

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

/** Single hero badge — coming-soon status, then layer, then kind. */
export const entryBadgeLabel = (entry: DocsEntry): string | null => {
  if (entry.kind === "placeholder") return "Coming soon";
  if (entry.layer) return layerBadgeLabel(entry.layer);
  if (entry.kind === "tool") return "Tool";
  if (entry.kind === "block") return "Block";
  if (entry.kind === "draft") return "Draft";
  return null;
};

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
