/**
 * Stable URL state for `/docs/explorer`.
 * Invalid params fall back safely — never throw.
 */

export const EXPLORER_PATH = "/docs/explorer";

export type ExplorerKind = "points" | "lines";
export type ExplorerDomain = "tube-rail" | "bus" | "cycle";
export type ExplorerTab = "browse" | "find";
export type ExplorerView = "list" | "map";
export type ExplorerDirection = "inbound" | "outbound";

export type ExplorerState = {
  kind: ExplorerKind;
  domain: ExplorerDomain;
  tab: ExplorerTab;
  view: ExplorerView;
  id?: string;
  dir: ExplorerDirection;
  q?: string;
};

export const DEFAULT_EXPLORER_STATE: ExplorerState = {
  kind: "points",
  domain: "tube-rail",
  tab: "browse",
  view: "list",
  dir: "inbound",
};

const KINDS = new Set<ExplorerKind>(["points", "lines"]);
const TABS = new Set<ExplorerTab>(["browse", "find"]);
const VIEWS = new Set<ExplorerView>(["list", "map"]);
const DIRS = new Set<ExplorerDirection>(["inbound", "outbound"]);

const POINTS_DOMAINS = new Set<ExplorerDomain>(["tube-rail", "bus", "cycle"]);
const LINES_DOMAINS = new Set<ExplorerDomain>(["tube-rail", "bus"]);

const firstParam = (
  value: string | string[] | undefined,
): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

const parseKind = (raw: string | undefined): ExplorerKind => {
  if (raw && KINDS.has(raw as ExplorerKind)) return raw as ExplorerKind;
  return DEFAULT_EXPLORER_STATE.kind;
};

const parseDomain = (
  kind: ExplorerKind,
  raw: string | undefined,
): ExplorerDomain => {
  if (kind === "lines") {
    if (raw && LINES_DOMAINS.has(raw as ExplorerDomain)) {
      return raw as ExplorerDomain;
    }
    return "tube-rail";
  }
  if (raw && POINTS_DOMAINS.has(raw as ExplorerDomain)) {
    return raw as ExplorerDomain;
  }
  return "tube-rail";
};

const parseTab = (raw: string | undefined): ExplorerTab => {
  if (raw && TABS.has(raw as ExplorerTab)) return raw as ExplorerTab;
  return DEFAULT_EXPLORER_STATE.tab;
};

const parseView = (raw: string | undefined): ExplorerView => {
  if (raw && VIEWS.has(raw as ExplorerView)) return raw as ExplorerView;
  return DEFAULT_EXPLORER_STATE.view;
};

const parseDir = (raw: string | undefined): ExplorerDirection => {
  if (raw && DIRS.has(raw as ExplorerDirection)) {
    return raw as ExplorerDirection;
  }
  return DEFAULT_EXPLORER_STATE.dir;
};

const parseOptionalString = (raw: string | undefined): string | undefined => {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
};

export type ExplorerSearchParams = Record<
  string,
  string | string[] | undefined
>;

/** Parse Explorer query params with safe fallbacks. */
export const parseExplorerState = (
  searchParams: ExplorerSearchParams | URLSearchParams,
): ExplorerState => {
  const get = (key: string): string | undefined => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) ?? undefined;
    }
    return firstParam(searchParams[key]);
  };

  const kind = parseKind(get("kind"));
  const domain = parseDomain(kind, get("domain"));
  const tab = parseTab(get("tab"));
  const view = parseView(get("view"));
  const dir = parseDir(get("dir"));
  const id = parseOptionalString(get("id"));
  const q = parseOptionalString(get("q"));

  return { kind, domain, tab, view, dir, id, q };
};

/**
 * Build a shareable Explorer href from a base state + partial override.
 * Omits default values so shared links stay short.
 */
export const buildExplorerHref = (
  next: Partial<ExplorerState>,
  base: ExplorerState = DEFAULT_EXPLORER_STATE,
): string => {
  const merged: ExplorerState = {
    ...base,
    ...next,
  };

  // Cycle is only valid under points — clamp when switching to lines.
  if (merged.kind === "lines" && merged.domain === "cycle") {
    merged.domain = "tube-rail";
  }

  const params = new URLSearchParams();

  if (merged.kind !== DEFAULT_EXPLORER_STATE.kind) {
    params.set("kind", merged.kind);
  }
  if (merged.domain !== DEFAULT_EXPLORER_STATE.domain) {
    params.set("domain", merged.domain);
  }
  if (merged.tab !== DEFAULT_EXPLORER_STATE.tab) {
    params.set("tab", merged.tab);
  }
  if (merged.view !== DEFAULT_EXPLORER_STATE.view) {
    params.set("view", merged.view);
  }
  if (merged.dir !== DEFAULT_EXPLORER_STATE.dir) {
    params.set("dir", merged.dir);
  }
  if (merged.id) {
    params.set("id", merged.id);
  }
  if (merged.q) {
    params.set("q", merged.q);
  }

  const query = params.toString();
  return query ? `${EXPLORER_PATH}?${query}` : EXPLORER_PATH;
};

/** Domains available for a given kind. */
export const domainsForKind = (kind: ExplorerKind): readonly ExplorerDomain[] =>
  kind === "lines" ? (["tube-rail", "bus"] as const) : (["tube-rail", "bus", "cycle"] as const);

export const domainLabel = (domain: ExplorerDomain): string => {
  switch (domain) {
    case "tube-rail":
      return "Tube & rail";
    case "bus":
      return "Bus";
    case "cycle":
      return "Cycle hire";
  }
};

export const kindLabel = (kind: ExplorerKind): string =>
  kind === "points" ? "Points" : "Lines";
