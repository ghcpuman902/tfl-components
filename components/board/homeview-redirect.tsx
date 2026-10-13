"use client"

import { useEffect } from "react"
import { BOARD_VIEW_PATH } from "@/lib/tfl/board-url-state"

/** Square + far density + unattended paging for Apple HomeView Safari. */
export const HOMEVIEW_BOARD_HASH =
  "#layout=square&density=far&behaviour=unattended"

export const HomeViewRedirect = () => {
  useEffect(() => {
    const target = `${BOARD_VIEW_PATH}${HOMEVIEW_BOARD_HASH}`
    if (`${window.location.pathname}${window.location.hash}` === target) return
    window.location.replace(target)
  }, [])

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6 text-muted-foreground">
      <p>
        Opening the Board in square layout…
        {" "}
        <a
          href={`${BOARD_VIEW_PATH}${HOMEVIEW_BOARD_HASH}`}
          className="text-foreground underline underline-offset-4"
        >
          Continue
        </a>
      </p>
    </main>
  )
}
