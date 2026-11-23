"use client"

import { useEffect, useState } from "react"
import {
  getBoardBusStopRoutes,
  getBoardPlaceLabel,
} from "@/lib/tfl/board-place-search-action"

export type BusStopInfo = {
  id: string
  name: string
  letter?: string
  /** "towards …" */
  context?: string
  routes: readonly string[]
}

const cache = new Map<string, Promise<BusStopInfo>>()

const readStop = (id: string): Promise<BusStopInfo> => {
  const hit = cache.get(id)
  if (hit) return hit
  const read = Promise.all([
    getBoardPlaceLabel("bus", id),
    getBoardBusStopRoutes(id),
  ]).then(([label, routes]) => ({
    id,
    name: label.ok ? label.place.name : id,
    letter: label.ok ? label.place.stopLetter : undefined,
    context: label.ok ? label.place.context : undefined,
    routes: routes.ok ? routes.routes : [],
  }))
  // A failed read is tried again next time.
  read.catch(() => cache.delete(id))
  cache.set(id, read)
  return read
}

/** Name, letter, direction and routes of each stop, once per id per visit. */
export const useBusStops = (ids: readonly string[]) => {
  const [known, setKnown] = useState<ReadonlyMap<string, BusStopInfo>>(
    () => new Map()
  )
  const key = ids.join(",")
  useEffect(() => {
    let cancelled = false
    for (const id of key ? key.split(",") : []) {
      void readStop(id)
        .then((info) => {
          if (cancelled) return
          setKnown((current) =>
            current.get(id) === info ? current : new Map(current).set(id, info)
          )
        })
        .catch(() => undefined)
    }
    return () => {
      cancelled = true
    }
  }, [key])
  const stops = ids.map((id) => known.get(id))
  return {
    stops,
    ready: stops.every(Boolean),
    /** Routes at any of the stops, in board order (9 before 18 before 205). */
    routes: [
      ...new Set(stops.flatMap((stop) => stop?.routes ?? [])),
    ].sort((a, b) => a.localeCompare(b, "en", { numeric: true })),
  }
}

/** Stops grouped under their shared name, letters in list order. */
export const stopsByName = (stops: readonly (BusStopInfo | undefined)[]) => {
  const groups: { name: string; letters: string[] }[] = []
  for (const stop of stops) {
    if (!stop) continue
    const group = groups.find((item) => item.name === stop.name)
    if (group) {
      if (stop.letter) group.letters.push(stop.letter)
    } else {
      groups.push({ name: stop.name, letters: stop.letter ? [stop.letter] : [] })
    }
  }
  return groups
}
