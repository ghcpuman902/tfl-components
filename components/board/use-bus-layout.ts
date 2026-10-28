"use client"

import { useSyncExternalStore } from "react"
import { NON_PRODUCTION } from "@/components/board/customise/dev-switcher"
import {
  BUS_LAYOUT_PARAM,
  parseBusLayout,
  type BusLayout,
} from "@/lib/tfl/board-bus-layout"

const noop = () => () => undefined
const getBusLayout = () =>
  parseBusLayout(
    new URLSearchParams(window.location.search).get(BUS_LAYOUT_PARAM),
    NON_PRODUCTION
  )
const getServerBusLayout = (): BusLayout => "stack"

/** The board paints panels only once hydrated, so this never moves a panel. */
export const useBusLayout = () =>
  useSyncExternalStore(noop, getBusLayout, getServerBusLayout)
