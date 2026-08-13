import {
  buildExplorerHref,
  type ExplorerDirection,
} from "./explorer-url-state";

/** Map legacy `/explore/lines` → unified Explorer. */
export const mapLegacyBrowseLinesRedirect = (): string =>
  buildExplorerHref({
    kind: "lines",
    domain: "tube-rail",
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
    id,
    dir,
  });
};

/**
 * Map legacy `/explore/bus-stops` → Points/Bus.
 * The old Trafalgar Square default is the cached featured example;
 * arbitrary nearby/search still uses a visitor key.
 */
export const mapLegacyBusStopsRedirect = (): string =>
  buildExplorerHref({
    kind: "points",
    domain: "bus",
  });
