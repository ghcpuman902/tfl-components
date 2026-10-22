"use client"

import { useSyncExternalStore } from "react"
import {
  CUSTOMISE_PARAM,
  CUSTOMISE_STORAGE_KEY,
  parseCustomiseStored,
  resolveCustomiseVariant,
  type CustomiseResolution,
  type CustomiseStored,
  type CustomiseVariant,
} from "@/lib/tfl/board-customise-variant"

type Snapshot = Omit<CustomiseResolution, "stored">

const SERVER: Snapshot = { variant: "panel", source: "default" }
let current: Snapshot | null = null
const listeners = new Set<() => void>()

const readStored = (): CustomiseStored => {
  try {
    const raw = window.localStorage.getItem(CUSTOMISE_STORAGE_KEY)
    return raw ? parseCustomiseStored(JSON.parse(raw)) : {}
  } catch {
    return {}
  }
}

const writeStored = (stored: CustomiseStored) => {
  try {
    if (Object.keys(stored).length === 0) {
      window.localStorage.removeItem(CUSTOMISE_STORAGE_KEY)
    } else {
      window.localStorage.setItem(CUSTOMISE_STORAGE_KEY, JSON.stringify(stored))
    }
  } catch {
    // Private mode: the variant just is not remembered.
  }
}

const resolve = (param: string | null): Snapshot => {
  const result = resolveCustomiseVariant({
    param,
    stored: readStored(),
    roll: Math.random,
  })
  writeStored(result.stored)
  return { variant: result.variant, source: result.source }
}

const getSnapshot = (): Snapshot => {
  if (!current) {
    current = resolve(
      new URLSearchParams(window.location.search).get(CUSTOMISE_PARAM)
    )
  }
  return current
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Variant-assignment hook: sticky per visitor in localStorage, `?customise=`
 * overrides (and is remembered until `?customise=panel`). The server and the
 * first client render use the current panel; the variant only matters once
 * Customise opens, so nothing on the page moves.
 */
export const useCustomiseVariant = (): Snapshot =>
  useSyncExternalStore(subscribe, getSnapshot, () => SERVER)

/** Dev switcher: same rules as the URL param, and the URL shows the choice. */
export const switchCustomiseVariant = (variant: CustomiseVariant) => {
  const param = variant === "panel" ? "panel" : variant
  current = resolve(param)
  const url = new URL(window.location.href)
  if (variant === "panel") url.searchParams.delete(CUSTOMISE_PARAM)
  else url.searchParams.set(CUSTOMISE_PARAM, variant)
  window.history.replaceState(window.history.state, "", url)
  for (const listener of listeners) listener()
}
