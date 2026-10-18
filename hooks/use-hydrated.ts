"use client"

import { useSyncExternalStore } from "react"

const subscribeNever = () => () => {}

/**
 * `false` on the server and during the hydration render, `true` afterwards.
 * Use for client-only values that must not change the first paint.
 */
export const useHydrated = (): boolean =>
  useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  )
