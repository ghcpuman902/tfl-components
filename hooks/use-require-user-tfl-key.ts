"use client"

import { useUserTflCredentials } from "@/components/user-tfl-credentials-provider"

export type RequireUserTflKeyResult = {
  /** True when a validated user key is ready for browser → TfL calls. */
  ready: boolean
  /** True after storage has been read (avoids flashing the gate on hydrate). */
  hydrated: boolean
  openDialog: () => void
  appKeyMasked: string | null
}

/**
 * Gate for Explorer / extensive operations that need a visitor key.
 * Cached introductory Explorer pages should NOT use this — they stay on site data.
 */
export const useRequireUserTflKey = (): RequireUserTflKeyResult => {
  const { status, hydrated, openDialog, appKeyMasked } = useUserTflCredentials()
  return {
    ready: status === "ready",
    hydrated,
    openDialog,
    appKeyMasked,
  }
}
