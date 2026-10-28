"use client"

import { useSyncExternalStore } from "react"
import {
  BUS_COLUMNS_MEDIA,
  BUS_LAYOUT_PARAM,
  resolveBusLayout,
  type BusLayout,
} from "@/lib/tfl/board-bus-layout"

const isLandscapeWide = () => window.matchMedia(BUS_COLUMNS_MEDIA).matches

const subscribe = (onStoreChange: () => void) => {
  const mq = window.matchMedia(BUS_COLUMNS_MEDIA)
  mq.addEventListener("change", onStoreChange)
  return () => mq.removeEventListener("change", onStoreChange)
}

const getBusLayout = () =>
  resolveBusLayout(
    new URLSearchParams(window.location.search).get(BUS_LAYOUT_PARAM),
    isLandscapeWide()
  )

/** Server snapshot; panels wait for hydration before they paint. */
const getServerBusLayout = (): BusLayout => "stack"

/**
 * Effective bus layout for this viewport. Panels only paint once hydrated,
 * so the media-query default is fixed before the first panel paint and does
 * not flip afterwards (rotation updates via the media-query subscription).
 */
export const useBusLayout = () =>
  useSyncExternalStore(subscribe, getBusLayout, getServerBusLayout)
