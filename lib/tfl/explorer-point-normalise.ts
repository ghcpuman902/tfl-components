/**
 * Common Explorer point shape used by TfLPointPicker and Find adapters.
 * Domain-specific optional fields are explicit — no `any`.
 */

export type ExplorerPointKind = "stopPoint" | "bikePoint";

export type ExplorerPoint = {
  id: string;
  name: string;
  kind: ExplorerPointKind;
  lat?: number;
  lon?: number;
  modes?: string[];
  lineIds?: string[];
  zone?: string;
  stopLetter?: string;
  smsCode?: string;
  towards?: string;
  distanceMeters?: number;
  bikes?: number;
  eBikes?: number;
  spaces?: number;
  aliasIds?: string[];
};

/** Five-digit SMS code for London bus stops. */
export const isSmsCodeQuery = (query: string): boolean =>
  /^\d{5}$/.test(query.trim());

type StopLike = {
  id?: string;
  commonName?: string;
  name?: string;
  stationName?: string;
  lat?: number;
  lon?: number;
  modes?: string[];
  lines?: Array<{ id?: string; name?: string }>;
  stopLetter?: string;
  indicator?: string;
  platformName?: string;
  distance?: number;
  additionalProperties?: Array<{ key?: string; value?: string }>;
};

const readProp = (
  properties: StopLike["additionalProperties"],
  key: string,
): string | undefined => {
  const value = properties?.find(
    (prop) => prop.key?.toLowerCase() === key.toLowerCase(),
  )?.value;
  return value?.trim() || undefined;
};

const readStopLetter = (stop: StopLike): string | undefined => {
  const fromLetter = stop.stopLetter?.trim();
  if (fromLetter) return fromLetter.slice(0, 2).toUpperCase();
  const fromIndicator = (stop.indicator ?? stop.platformName)
    ?.replace(/^stop\s+/i, "")
    .trim();
  if (fromIndicator && fromIndicator.length <= 2) {
    return fromIndicator.toUpperCase();
  }
  return undefined;
};

/** Normalise a StopPoint / search match into ExplorerPoint. */
export const normaliseStopPoint = (stop: StopLike): ExplorerPoint | null => {
  const id = stop.id?.trim();
  if (!id) return null;

  const name =
    (stop.commonName ?? stop.name ?? stop.stationName)?.trim() || "Unknown stop";

  const lineIds = stop.lines
    ?.map((line) => line.id ?? line.name)
    .filter((value): value is string => Boolean(value));

  return {
    id,
    name,
    kind: "stopPoint",
    lat: typeof stop.lat === "number" ? stop.lat : undefined,
    lon: typeof stop.lon === "number" ? stop.lon : undefined,
    modes: stop.modes,
    lineIds,
    stopLetter: readStopLetter(stop),
    smsCode: readProp(stop.additionalProperties, "SmsCode"),
    towards: readProp(stop.additionalProperties, "Towards"),
    distanceMeters: typeof stop.distance === "number" ? stop.distance : undefined,
  };
};

type BikeLike = {
  id?: string;
  name?: string;
  commonName?: string;
  lat?: number;
  lon?: number;
  distance?: number;
  bikes?: number;
  eBikes?: number;
  spaces?: number;
};

/** Normalise a BikePoint / search result into ExplorerPoint. */
export const normaliseBikePoint = (dock: BikeLike): ExplorerPoint | null => {
  const id = dock.id?.trim();
  if (!id) return null;

  return {
    id,
    name: (dock.name ?? dock.commonName)?.trim() || "Unknown dock",
    kind: "bikePoint",
    lat: typeof dock.lat === "number" ? dock.lat : undefined,
    lon: typeof dock.lon === "number" ? dock.lon : undefined,
    distanceMeters:
      typeof dock.distance === "number" ? dock.distance : undefined,
    bikes: typeof dock.bikes === "number" ? dock.bikes : undefined,
    eBikes: typeof dock.eBikes === "number" ? dock.eBikes : undefined,
    spaces: typeof dock.spaces === "number" ? dock.spaces : undefined,
  };
};

type RailCatalogLike = {
  id: string;
  name: string;
  displayName?: string;
  modes?: string[];
  lines?: string[];
  aliasIds?: string[];
  zone?: string;
  lat?: number;
  lon?: number;
};

/** Normalise a Tube & rail catalog station into ExplorerPoint. */
export const normaliseRailPoint = (
  station: RailCatalogLike,
): ExplorerPoint => ({
  id: station.id,
  name: station.displayName ?? station.name,
  kind: "stopPoint",
  lat: station.lat,
  lon: station.lon,
  modes: station.modes,
  lineIds: station.lines,
  zone: station.zone,
  aliasIds: station.aliasIds,
});
