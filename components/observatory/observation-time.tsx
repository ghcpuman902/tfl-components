"use client"

import { useEffect, useState } from "react"
import {
  formatObservationAge,
  formatObservationLocal,
} from "@/lib/tfl/observatory/format-age"

const RELATIVE_TICK_MS = 15_000

export const ObservationTime = ({
  iso,
  fallback,
}: {
  iso: string | null
  fallback: string
}) => {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    if (!iso) {
      setNow(null)
      return
    }

    const readNow = () => {
      setNow(Date.now())
    }
    readNow()
    const id = window.setInterval(readNow, RELATIVE_TICK_MS)
    return () => window.clearInterval(id)
  }, [iso])

  if (!iso) {
    return <span>{fallback}</span>
  }

  const atMs = Date.parse(iso)
  if (!Number.isFinite(atMs)) {
    return <span>{fallback}</span>
  }

  const label =
    now == null ? null : formatObservationAge(atMs, now)

  return (
    <time
      dateTime={iso}
      title={now == null ? undefined : formatObservationLocal(atMs)}
    >
      {label ?? "\u00a0"}
    </time>
  )
}
