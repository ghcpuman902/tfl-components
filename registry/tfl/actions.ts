"use server";

import { getTflClient } from "@/lib/tfl/client";
import { isValidLatLon, truncateLatLon } from "@/lib/tfl/geo";

export type BusArrival = {
  lineName?: string;
  destinationName?: string;
  towards?: string;
  direction?: string;
  bearing?: string;
  platformName?: string;
  timeToStation?: number;
  expectedArrival?: string;
  vehicleId?: string;
};

export type NearbyBusStop = {
  id: string;
  name: string;
  indicator?: string;
  stopLetter?: string;
  towards?: string;
  distance?: number;
  lines?: string[];
};

export type GetBusArrivalsResult =
  | { ok: true; arrivals: BusArrival[]; stopName?: string }
  | { ok: false; error: string };

export type GetNearbyBusStopsResult =
  | { ok: true; stops: NearbyBusStop[]; lat: number; lon: number; radius: number }
  | { ok: false; error: string };

export type SearchBusStopsResult =
  | { ok: true; stops: NearbyBusStop[] }
  | { ok: false; error: string };

const NEARBY_RADIUS_METERS = 400;
const MAX_NEARBY_STOPS = 8;
const MAX_SEARCH_STOPS = 6;

type AdditionalProperty = { key?: string; value?: string };

const readTowards = (properties?: AdditionalProperty[]): string | undefined => {
  const value = properties?.find((prop) => prop.key?.toLowerCase() === "towards")?.value;
  return value?.trim() || undefined;
};

const readStopLetter = (stopLetter?: string, indicator?: string): string | undefined => {
  const fromLetter = stopLetter?.trim();
  if (fromLetter) return fromLetter.slice(0, 2).toUpperCase();
  const fromIndicator = indicator?.replace(/^stop\s+/i, "").trim();
  if (fromIndicator && fromIndicator.length <= 2) return fromIndicator.toUpperCase();
  return undefined;
};

const mapStopPoint = (stop: {
  id?: string;
  commonName?: string;
  name?: string;
  indicator?: string;
  stopLetter?: string;
  distance?: number;
  lines?: Array<{ name?: string }>;
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
    lines: stop.lines?.map((line) => line.name).filter(Boolean) as string[] | undefined,
  };
};

const isBusStop = (modes?: string[]) => modes?.includes("bus") ?? false;

/** London bus stop points that support live arrivals (not hubs / station parents). */
const isBoardableBusStopId = (id: string) => /^490\d/i.test(id);

const mapStopsFromGeoResponse = (
  stopPoints: Array<{
    id?: string;
    commonName?: string;
    indicator?: string;
    stopLetter?: string;
    distance?: number;
    modes?: string[];
    lines?: Array<{ name?: string }>;
    additionalProperties?: AdditionalProperty[];
  }>,
  limit: number,
): NearbyBusStop[] =>
  stopPoints
    .filter((stop) => stop.id && isBusStop(stop.modes) && isBoardableBusStopId(stop.id))
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
    .slice(0, limit)
    .map(mapStopPoint)
    .filter((stop): stop is NearbyBusStop => stop !== null);

const fetchBusStopsNear = async (
  lat: number,
  lon: number,
  limit: number,
): Promise<NearbyBusStop[]> => {
  const client = getTflClient();
  const response = await client.stopPoint.getByGeoPoint({
    lat,
    lon,
    radius: NEARBY_RADIUS_METERS,
    modes: ["bus"],
    returnLines: true,
  });
  return mapStopsFromGeoResponse(response.stopPoints ?? [], limit);
};

/** Enrich search hits with stop letter / towards from full stop details. */
const enrichStops = async (stops: NearbyBusStop[]): Promise<NearbyBusStop[]> => {
  if (stops.length === 0) return stops;

  try {
    const client = getTflClient();
    const details = await client.stopPoint.get(stops.map((stop) => stop.id));
    const detailList = Array.isArray(details) ? details : [details];
    const byId = new Map(
      detailList
        .map((detail) => mapStopPoint(detail))
        .filter((stop): stop is NearbyBusStop => stop !== null)
        .map((stop) => [stop.id, stop] as const),
    );

    return stops.map((stop) => {
      const detail = byId.get(stop.id);
      if (!detail) return stop;
      return {
        ...stop,
        stopLetter: stop.stopLetter ?? detail.stopLetter,
        towards: stop.towards ?? detail.towards,
        lines: stop.lines?.length ? stop.lines : detail.lines,
        name: stop.name || detail.name,
      };
    });
  } catch {
    return stops;
  }
};

export async function getNearbyBusStops(
  lat: number,
  lon: number,
): Promise<GetNearbyBusStopsResult> {
  if (!isValidLatLon(lat, lon)) {
    return { ok: false, error: "Invalid coordinates." };
  }

  const { lat: truncatedLat, lon: truncatedLon } = truncateLatLon(lat, lon);

  try {
    const stops = await fetchBusStopsNear(truncatedLat, truncatedLon, MAX_NEARBY_STOPS);

    if (stops.length === 0) {
      return {
        ok: false,
        error: `No bus stops found within ${NEARBY_RADIUS_METERS}m. Try searching by street name instead.`,
      };
    }

    return {
      ok: true,
      stops,
      lat: truncatedLat,
      lon: truncatedLon,
      radius: NEARBY_RADIUS_METERS,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to find nearby stops.";
    return { ok: false, error: message };
  }
}

export async function searchBusStops(query: string): Promise<SearchBusStopsResult> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: "Enter at least 2 characters to search." };
  }

  try {
    const client = getTflClient();
    const response = await client.stopPoint.search({
      query: trimmed,
      modes: ["bus"],
      maxResults: MAX_SEARCH_STOPS,
    });

    const matches = (response.matches ?? []).filter(
      (match) => match.id && isBusStop(match.modes),
    );

    // Prefer real boarding points (490…). Hubs like HUBLBG have no bus arrivals.
    const boardable = matches
      .filter((match) => match.id && isBoardableBusStopId(match.id))
      .map((match) =>
        mapStopPoint({
          id: match.id,
          commonName: match.name ?? match.stationName,
          indicator: match.platformName,
          lines: match.lines,
        }),
      )
      .filter((stop): stop is NearbyBusStop => stop !== null);

    if (boardable.length > 0) {
      const enriched = await enrichStops(boardable.slice(0, MAX_SEARCH_STOPS));
      return { ok: true, stops: enriched };
    }

    // Expand the first hub/station hit to nearby bus stops via its coordinates.
    const expandable = matches.find(
      (match) =>
        typeof match.lat === "number" &&
        typeof match.lon === "number" &&
        isValidLatLon(match.lat, match.lon),
    );

    if (expandable?.lat != null && expandable.lon != null) {
      const nearby = await fetchBusStopsNear(expandable.lat, expandable.lon, MAX_SEARCH_STOPS);
      if (nearby.length > 0) {
        return { ok: true, stops: nearby };
      }
    }

    return { ok: false, error: "No bus stops matched that search." };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to search stops.";
    return { ok: false, error: message };
  }
}

export async function getBusArrivals(
  stopId: string,
  stopName?: string,
): Promise<GetBusArrivalsResult> {
  const trimmed = stopId.trim();
  if (!trimmed) {
    return { ok: false, error: "No stop selected." };
  }

  try {
    const client = getTflClient();
    const arrivals = await client.stopPoint.getArrivals({
      stopPointIds: [trimmed],
      sortBy: "timeToStation",
    });
    const mapped: BusArrival[] = arrivals.map((arrival) => ({
      lineName: arrival.lineName,
      destinationName: arrival.destinationName,
      towards: arrival.towards,
      direction: arrival.direction,
      bearing: arrival.bearing,
      platformName: arrival.platformName,
      timeToStation: arrival.timeToStation,
      expectedArrival: arrival.expectedArrival,
      vehicleId: arrival.vehicleId,
    }));
    return { ok: true, arrivals: mapped, stopName };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch arrivals.";
    if (message.includes("404")) {
      return {
        ok: false,
        error: "This stop has no live bus arrivals. Pick a stop with a letter (e.g. Stop R).",
      };
    }
    return { ok: false, error: message };
  }
}
