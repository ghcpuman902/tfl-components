"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  parseDocsStripQuery,
  writeDocsStripQuery,
} from "@/lib/docs-strip-query"

type Options = {
  validLineIds: readonly string[]
  defaultLineId: string
  /** Persist Mono / Fit the same way line topology persists `?line=`. */
  persistFlags?: boolean
}

export const useDocsStripQuery = ({
  validLineIds,
  defaultLineId,
  persistFlags = false,
}: Options) => {
  const valid = useMemo(() => new Set(validLineIds), [validLineIds])
  const [lineId, setLineId] = useState(defaultLineId)
  const [mono, setMono] = useState(false)
  const [fit, setFit] = useState(false)
  const ready = useRef(false)

  useEffect(() => {
    if (!ready.current) {
      ready.current = true
      const parsed = parseDocsStripQuery(
        window.location.search,
        valid,
        defaultLineId
      )
      let deferred = false
      if (parsed.lineId !== lineId) {
        setLineId(parsed.lineId)
        deferred = true
      }
      if (persistFlags) {
        if (parsed.mono !== mono) {
          setMono(parsed.mono)
          deferred = true
        }
        if (parsed.fit !== fit) {
          setFit(parsed.fit)
          deferred = true
        }
      }
      if (deferred) return
    }

    const next = writeDocsStripQuery(window.location.search, {
      lineId,
      ...(persistFlags ? { mono, fit } : {}),
    })
    if (next == null) return
    const url = new URL(window.location.href)
    url.search = next
    window.history.replaceState(null, "", url)
  }, [defaultLineId, fit, lineId, mono, persistFlags, valid])

  return { lineId, setLineId, mono, setMono, fit, setFit }
}
