/**
 * Single source for docs navigation, home catalog, and static params.
 * Groups follow how Londoners think about transport — not TfL API modes.
 */

export type DocsGroupId =
  | "getting-started"
  | "foundations"
  | "tube-rail"
  | "bus"
  | "tools";

export type DocsEntryKind = "page" | "component" | "tool";

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
};

export type DocsGroup = {
  id: DocsGroupId;
  title: string;
  description: string;
};

const REGISTRY_BASE = "https://tfl-components.vercel.app/r";

export const DOCS_GROUPS: readonly DocsGroup[] = [
  {
    id: "getting-started",
    title: "Getting started",
    description: "How the library works and how to install.",
  },
  {
    id: "foundations",
    title: "Foundations",
    description: "Cross-mode brand primitives and diagram standards.",
  },
  {
    id: "tube-rail",
    title: "Tube & rail",
    description: "Underground, Overground, Elizabeth line, DLR, and Tram.",
  },
  {
    id: "bus",
    title: "Bus",
    description: "Route-number boards for London buses.",
  },
  {
    id: "tools",
    title: "Tools",
    description: "Browse helpers — not installable blocks.",
  },
] as const;

export const DOCS_ENTRIES: readonly DocsEntry[] = [
  {
    slug: "introduction",
    title: "Introduction",
    description:
      "Open React components for London transport, copied into your app via the shadcn registry.",
    group: "getting-started",
    kind: "page",
    href: "/",
  },
  {
    slug: "installation",
    title: "Installation",
    description:
      "Add a board with the shadcn CLI, install tfl-ts, and set your TfL API keys.",
    group: "getting-started",
    kind: "page",
    href: "/installation",
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
  },
  {
    slug: "line-diagram",
    title: "Line diagram",
    description:
      "Horizontal strip, full route, and journey A→B following the Line diagram standard.",
    group: "foundations",
    kind: "component",
    href: "/components/line-diagram",
    registryName: "line-diagram",
    registryUrl: `${REGISTRY_BASE}/line-diagram.json`,
  },
  {
    slug: "tube-status-board",
    title: "Status board",
    description:
      "Live tube and rail status with severity sorting and official line colours.",
    group: "tube-rail",
    kind: "component",
    href: "/components/tube-status-board",
    registryName: "tube-status-board",
    registryUrl: `${REGISTRY_BASE}/tube-status-board.json`,
  },
  {
    slug: "live-arrivals-board",
    title: "Live arrivals",
    description: "Polling stop arrivals board for tube and rail stations.",
    group: "tube-rail",
    kind: "component",
    href: "/components/live-arrivals-board",
    registryName: "live-arrivals-board",
    registryUrl: `${REGISTRY_BASE}/live-arrivals-board.json`,
  },
  {
    slug: "bus-arrivals-board",
    title: "Bus arrivals",
    description:
      "Nearby bus stops and live arrivals with route-number chips.",
    group: "bus",
    kind: "component",
    href: "/components/bus-arrivals-board",
    registryName: "bus-arrivals-board",
    registryUrl: `${REGISTRY_BASE}/bus-arrivals-board.json`,
  },
  {
    slug: "browse-lines",
    title: "Browse lines",
    description: "Lines grouped by mode with links to route stations.",
    group: "tools",
    kind: "tool",
    href: "/tools/browse-lines",
  },
  {
    slug: "route-stations",
    title: "Route stations",
    description: "Stop sequence for one line and direction.",
    group: "tools",
    kind: "tool",
    href: "/tools/route-stations",
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
