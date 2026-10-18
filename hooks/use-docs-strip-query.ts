"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type SetStateAction,
} from "react"
import { useHydrated } from "@/hooks/use-hydrated"
import {
  parseDocsStripQuery,
  writeDocsStripQuery,
  type DocsStripQueryState,
} from "@/lib/docs-strip-query"

type Options = {
  validLineIds: readonly string[]
  defaultLineId: string
  /** Persist Mono / Fit the same way line topology persists `?line=`. */
  persistFlags?: boolean
}

const subscribeNever = () => () => {}

const readSearch = (): string => window.location.search

const getServerSearch = (): string => ""

const resolveAction = <T,>(action: SetStateAction<T>, current: T): T =>
  typeof action === "function" ? (action as (value: T) => T)(current) : action

/**
 * The server and hydration render use the defaults; the URL is read right
 * after hydration. Picks made by the reader override what the URL said.
 */
export const useDocsStripQuery = ({
  validLineIds,
  defaultLineId,
  persistFlags = false,
}: Options) => {
  const valid = useMemo(() => new Set(validLineIds), [validLineIds])
  const hydrated = useHydrated()
  const search = useSyncExternalStore(
    subscribeNever,
    readSearch,
    getServerSearch
  )
  const [picked, setPicked] = useState<Partial<DocsStripQueryState>>({})

  const fromUrl = useMemo(
    () => parseDocsStripQuery(search, valid, defaultLineId),
    [defaultLineId, search, valid]
  )
  const lineId = picked.lineId ?? fromUrl.lineId
  const urlMono = persistFlags && fromUrl.mono
  const urlFit = persistFlags && fromUrl.fit
  const mono = picked.mono ?? urlMono
  const fit = picked.fit ?? urlFit

  const setLineId = useCallback(
    (action: SetStateAction<string>) =>
      setPicked((current) => ({
        ...current,
        lineId: resolveAction(action, current.lineId ?? fromUrl.lineId),
      })),
    [fromUrl.lineId]
  )
  const setMono = useCallback(
    (action: SetStateAction<boolean>) =>
      setPicked((current) => ({
        ...current,
        mono: resolveAction(action, current.mono ?? urlMono),
      })),
    [urlMono]
  )
  const setFit = useCallback(
    (action: SetStateAction<boolean>) =>
      setPicked((current) => ({
        ...current,
        fit: resolveAction(action, current.fit ?? urlFit),
      })),
    [urlFit]
  )

  useEffect(() => {
    if (!hydrated) return
    const next = writeDocsStripQuery(window.location.search, {
      lineId,
      ...(persistFlags ? { mono, fit } : {}),
    })
    if (next == null) return
    const url = new URL(window.location.href)
    url.search = next
    window.history.replaceState(null, "", url)
  }, [fit, hydrated, lineId, mono, persistFlags])

  return { lineId, setLineId, mono, setMono, fit, setFit }
}
