import {
  buildExplorerHref,
  type ExplorerDirection,
} from "./explorer-url-state";

/** Map legacy `/explore/lines` → unified Explorer. */
export const mapLegacyBrowseLinesRedirect = (): string =>
  buildExplorerHref({
    kind: "lines",
    domain: "tube-rail",
    tab: "browse",
  });

/**
 * Map legacy `/explore/routes?lineId=&direction=` → unified Explorer.
 * Preserves the old default of `"central"` when `lineId` is missing.
 */
export const mapLegacyRouteStationsRedirect = (
  lineId?: string | null,
  direction?: string | null,
): string => {
  const id = lineId?.trim() ? lineId.trim().toLowerCase() : "central";
  const dir: ExplorerDirection =
    direction === "outbound" ? "outbound" : "inbound";
  return buildExplorerHref({
    kind: "lines",
    domain: "tube-rail",
    tab: "browse",
    id,
    dir,
  });
};

/**
 * Map legacy `/explore/bus-stops` → Points/Bus Browse.
 * The old Trafalgar Square default is the free Browse example;
 * arbitrary nearby/search is now keyed Find.
 */
export const mapLegacyBusStopsRedirect = (): string =>
  buildExplorerHref({
    kind: "points",
    domain: "bus",
    tab: "browse",
  });
