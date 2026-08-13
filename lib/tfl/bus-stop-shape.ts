/**
 * Shared bus-stop normalisation — used by Server Actions and Explorer loaders.
 * Plain module (not `"use server"`).
 */

export type AdditionalProperty = { key?: string; value?: string };

export type NearbyBusStop = {
  id: string;
  name: string;
  indicator?: string;
  stopLetter?: string;
  towards?: string;
  distance?: number;
  lines?: string[];
  lat?: number;
  lon?: number;
  smsCode?: string;
};

export const readTowards = (
  properties?: AdditionalProperty[],
): string | undefined => {
  const value = properties?.find(
    (prop) => prop.key?.toLowerCase() === "towards",
  )?.value;
  return value?.trim() || undefined;
};

export const readStopLetter = (
  stopLetter?: string,
  indicator?: string,
): string | undefined => {
  const fromLetter = stopLetter?.trim();
  if (fromLetter) return fromLetter.slice(0, 2).toUpperCase();
  const fromIndicator = indicator?.replace(/^stop\s+/i, "").trim();
  if (fromIndicator && fromIndicator.length <= 2) {
    return fromIndicator.toUpperCase();
  }
  return undefined;
};

export const readSmsCode = (
  properties?: AdditionalProperty[],
): string | undefined => {
  const value = properties?.find(
    (prop) => prop.key?.toLowerCase() === "smscode",
  )?.value;
  const trimmed = value?.trim();
  return trimmed || undefined;
};

/** London bus stop points that support live arrivals (not hubs / station parents). */
export const isBoardableBusStopId = (id: string): boolean =>
  /^490\d/i.test(id);

export const isBusStop = (modes?: string[]): boolean =>
  modes?.includes("bus") ?? false;

export const mapStopPoint = (stop: {
  id?: string;
  commonName?: string;
  name?: string;
  indicator?: string;
  stopLetter?: string;
  distance?: number;
  lat?: number;
  lon?: number;
  lines?: Array<{ name?: string; id?: string }>;
  additionalProperties?: AdditionalProperty[];
}): NearbyBusStop | null => {
  if (!stop.id) return null;

  return {
    id: stop.id,
    name: (stop.commonName ?? stop.name)?.trim() || "Unknown stop",
    indicator: stop.indicator,
    stopLetter: readStopLetter(stop.stopLetter, stop.indicator),
    towards: readTowards(stop.additionalProperties),
    distance: stop.distance,
    lines: stop.lines
      ?.map((line) => line.name ?? line.id)
      .filter((value): value is string => Boolean(value)),
    lat: typeof stop.lat === "number" ? stop.lat : undefined,
    lon: typeof stop.lon === "number" ? stop.lon : undefined,
    smsCode: readSmsCode(stop.additionalProperties),
  };
};

export const mapStopsFromGeoResponse = (
  stopPoints: Array<{
    id?: string;
    commonName?: string;
    indicator?: string;
    stopLetter?: string;
    distance?: number;
    lat?: number;
    lon?: number;
    modes?: string[];
    lines?: Array<{ name?: string; id?: string }>;
    additionalProperties?: AdditionalProperty[];
  }>,
  limit: number,
): NearbyBusStop[] =>
  stopPoints
    .filter(
      (stop) => stop.id && isBusStop(stop.modes) && isBoardableBusStopId(stop.id),
    )
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
    .slice(0, limit)
    .map(mapStopPoint)
    .filter((stop): stop is NearbyBusStop => stop !== null);
