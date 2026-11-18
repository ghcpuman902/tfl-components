"use client"

import { useSyncExternalStore } from "react"
import {
  REORDER_PARAM,
  parseReorderParam,
  type ReorderVariant,
} from "@/lib/tfl/board-reorder-variant"

let current: ReorderVariant | null = null

const getSnapshot = (): ReorderVariant => {
  current ??= parseReorderParam(
    new URLSearchParams(window.location.search).get(REORDER_PARAM)
  )
  return current
}

const subscribe = () => () => {}

/** `?reorder=a|b` for the Customise lists; the server renders the default. */
export const useReorderVariant = (): ReorderVariant =>
  useSyncExternalStore(subscribe, getSnapshot, () => "default")
