"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const MapSkeleton = () => (
  <div
    className="h-72 w-full animate-pulse rounded-lg border border-border bg-muted sm:h-96"
    aria-hidden
  />
);

/**
 * Lazy MapLibre surface — keeps the SDK off the initial Explorer JS.
 */
export const ExplorerPointMapLazy = dynamic(
  () =>
    import("@/components/explorer/explorer-point-map").then(
      (mod) => mod.ExplorerPointMap,
    ),
  {
    ssr: false,
    loading: () => <MapSkeleton />,
  },
);

export type ExplorerPointMapLazyProps = ComponentProps<
  typeof ExplorerPointMapLazy
>;
