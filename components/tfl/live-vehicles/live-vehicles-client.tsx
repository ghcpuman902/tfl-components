"use client";

import { useEffect, useRef, useState } from "react";
import { TflBusGeoMap } from "@/components/tfl/geography/tfl-bus-geo-map";
import { TflGeographicMap } from "@/components/tfl/geography/tfl-geographic-map";
import { DataSourceLabel } from "@/components/docs/data-source-label";
import { getLiveVehiclesAction } from "@/lib/tfl/live-vehicles-action";
import type { LiveVehiclesPayload } from "@/lib/tfl/live-vehicles-action";
import { TRACKED_RAIL_LINE_ID } from "@/lib/tfl/live-vehicles-stops";
import type { VehiclePosition } from "@/lib/tfl/map-vehicles";

const POLL_MS = 30_000;
const TWEEN_MS = 2_000;
const TUBE_MODES = ["tube"] as const;
const VICTORIA_LINE_IDS = [TRACKED_RAIL_LINE_ID] as const;

const easeInOut = (t: number) => t * t * (3 - 2 * t);

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

const tweenVehicles = (
  from: readonly VehiclePosition[],
  to: readonly VehiclePosition[],
  t: number,
): VehiclePosition[] => {
  const fromById = new Map(from.map((vehicle) => [vehicle.vehicleId, vehicle]));
  const progress = easeInOut(Math.min(1, Math.max(0, t)));
  return to.map((next) => {
    const prev = fromById.get(next.vehicleId);
    if (!prev) return next;
    return {
      ...next,
      lat: lerp(prev.lat, next.lat, progress),
      lon: lerp(prev.lon, next.lon, progress),
    };
  });
};

const useTweenedVehicles = (target: readonly VehiclePosition[]) => {
  const [display, setDisplay] = useState<VehiclePosition[]>(() => [...target]);
  const fromRef = useRef<VehiclePosition[]>([...target]);
  const toRef = useRef<VehiclePosition[]>([...target]);
  const startRef = useRef(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    fromRef.current = display;
    toRef.current = [...target];
    startRef.current = performance.now();

    const tick = (now: number) => {
      const t = (now - startRef.current) / TWEEN_MS;
      setDisplay(tweenVehicles(fromRef.current, toRef.current, t));
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
    // `display` is the previous frame snapshot; do not re-run when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
};

export const LiveVehiclesClient = ({
  initial,
}: {
  initial: LiveVehiclesPayload;
}) => {
  const [payload, setPayload] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rail = useTweenedVehicles(payload.rail);
  const bus = useTweenedVehicles(payload.bus);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      setLoading(true);
      try {
        const result = await getLiveVehiclesAction();
        if (cancelled) return;
        if (!result.ok) {
          setError(result.error);
        } else {
          setError(null);
          setPayload(result.data);
        }
      } catch {
        if (!cancelled) setError("Failed to load live vehicles.");
      } finally {
        if (!cancelled) {
          setLoading(false);
          timer = setTimeout(load, POLL_MS);
        }
      }
    };

    timer = setTimeout(load, POLL_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-2">
          <h2 className="px-4 text-sm font-medium text-foreground">
            Victoria line
          </h2>
          <div className="h-[min(60vh,28rem)] overflow-hidden border border-border">
            <TflGeographicMap
              modes={TUBE_MODES}
              lineIds={VICTORIA_LINE_IDS}
              vehicles={rail}
              showNavigation={false}
            />
          </div>
        </section>
        <section className="space-y-2">
          <h2 className="px-4 text-sm font-medium text-foreground">
            Route 24
          </h2>
          <div className="h-[min(60vh,28rem)] overflow-hidden border border-border">
            <TflBusGeoMap
              data={payload.busGeometry}
              vehicles={bus}
              showNavigation={false}
            />
          </div>
        </section>
      </div>
      {error ? (
        <p className="px-4 text-sm text-destructive">{error}</p>
      ) : null}
      <DataSourceLabel
        source="live"
        fetchedAt={payload.fetchedAt}
        loading={loading}
        className="px-4"
      />
    </div>
  );
};
