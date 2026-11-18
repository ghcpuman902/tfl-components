"use client"

import { useEffect } from "react"

/** Hands a short link over to the Board it encodes, keeping history clean. */
export const BoardShortLinkOpen = ({
  href,
  stationName,
}: {
  href: string
  stationName?: string
}) => {
  useEffect(() => {
    window.location.replace(href)
  }, [href])

  return (
    <main className="mx-auto flex min-h-[60svh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-balance text-muted-foreground">
        Opening the live board{stationName ? ` for ${stationName}` : ""}…
      </p>
      <a href={href} className="underline underline-offset-4">
        Open board
      </a>
    </main>
  )
}
