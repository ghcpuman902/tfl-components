"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEventHandler,
} from "react"
import {
  UNATTENDED_DEFAULT_DWELL_MS,
  createUnattendedSequence,
  isDocumentHidden,
  reconcileUnattendedSequence,
  resumeUnattendedSequence,
  tickUnattendedSequence,
  unattendedDwellProgress,
  type UnattendedPauseReason,
} from "@/lib/tfl/unattended-sequence"

export type UseUnattendedSequenceOptions = {
  itemIds: readonly string[]
  dwellMs?: number
  /** Per-item dwell needs (e.g. a scroll that must reach its last line). */
  dwellMsById?: Readonly<Record<string, number>>
  /** Off-screen counts as hidden: frozen, then a full dwell on return. */
  offscreen?: boolean
  /** Stagger this panel against others on the same board. */
  startDelayMs?: number
  enabled?: boolean
}

export type UseUnattendedSequenceResult = {
  index: number
  itemId: string | null
  progress: number
  started: boolean
  /** Bumps when the current dwell restarts in place (tab or panel back). */
  restarts: number
  pauseReasons: readonly UnattendedPauseReason[]
  handleFocus: FocusEventHandler<HTMLElement>
  handleBlur: FocusEventHandler<HTMLElement>
}

const idsKey = (ids: readonly string[]) => ids.join("\0")

/** Reduced motion does not pause the sequence — paint stays instant. */
export const useUnattendedSequence = ({
  itemIds,
  dwellMs = UNATTENDED_DEFAULT_DWELL_MS,
  dwellMsById,
  offscreen = false,
  startDelayMs = 0,
  enabled = true,
}: UseUnattendedSequenceOptions): UseUnattendedSequenceResult => {
  const itemKey = idsKey(itemIds)

  const [index, setIndex] = useState(0)
  const [itemId, setItemId] = useState<string | null>(itemIds[0] ?? null)
  const [progress, setProgress] = useState(0)
  const [started, setStarted] = useState(startDelayMs <= 0)
  const [restarts, setRestarts] = useState(0)
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(false)

  const stateRef = useRef(
    createUnattendedSequence({
      itemIds,
      nowMs: 0,
      startDelayMs,
    })
  )
  const itemIdsRef = useRef(itemIds)
  const dwellMsByIdRef = useRef(dwellMsById)

  useEffect(() => {
    dwellMsByIdRef.current = dwellMsById
  }, [dwellMsById])

  useEffect(() => {
    itemIdsRef.current = itemIds
  }, [itemIds])

  useEffect(() => {
    if (!enabled) return
    stateRef.current = createUnattendedSequence({
      itemIds: itemIdsRef.current,
      nowMs: Date.now(),
      startDelayMs,
    })
    const next = stateRef.current
    setIndex(next.index)
    setItemId(next.itemId)
    setStarted(next.remainingStartDelayMs <= 0)
    setProgress(
      unattendedDwellProgress(next, {
        dwellMs,
        itemCount: itemIdsRef.current.length,
      })
    )
  }, [dwellMs, enabled, startDelayMs])

  useEffect(() => {
    if (!enabled) return
    const next = reconcileUnattendedSequence(stateRef.current, itemIds)
    stateRef.current = next
    setIndex(next.index)
    setItemId(next.itemId)
    setStarted(next.remainingStartDelayMs <= 0)
    setProgress(
      unattendedDwellProgress(next, { dwellMs, itemCount: itemIds.length })
    )
  }, [dwellMs, enabled, itemKey, itemIds])

  useEffect(() => {
    if (!enabled) return

    const syncHidden = () => {
      const nextHidden = isDocumentHidden(document.visibilityState)
      setHidden((current) => {
        if (current && !nextHidden) {
          stateRef.current = resumeUnattendedSequence(
            stateRef.current,
            Date.now()
          )
          const next = stateRef.current
          setIndex(next.index)
          setItemId(next.itemId)
          setStarted(next.remainingStartDelayMs <= 0)
          setRestarts(next.restarts)
          setProgress(
            unattendedDwellProgress(next, {
              dwellMs,
              itemCount: itemIdsRef.current.length,
            })
          )
        }
        return nextHidden
      })
    }

    syncHidden()
    document.addEventListener("visibilitychange", syncHidden)
    return () => document.removeEventListener("visibilitychange", syncHidden)
  }, [dwellMs, enabled])

  useEffect(() => {
    if (!enabled || itemIds.length <= 1) return

    const tick = () => {
      const pauseReasons: UnattendedPauseReason[] = []
      if (focused) pauseReasons.push("focus")
      if (hidden || offscreen) pauseReasons.push("hidden")
      const next = tickUnattendedSequence(stateRef.current, {
        itemIds: itemIdsRef.current,
        nowMs: Date.now(),
        dwellMs,
        dwellMsById: dwellMsByIdRef.current,
        pauseReasons,
      })
      stateRef.current = next
      setIndex(next.index)
      setItemId(next.itemId)
      setStarted(next.remainingStartDelayMs <= 0)
      setProgress(
        unattendedDwellProgress(next, {
          dwellMs,
          dwellMsById: dwellMsByIdRef.current,
          itemCount: itemIdsRef.current.length,
        })
      )
    }

    const interval = window.setInterval(tick, 250)
    return () => window.clearInterval(interval)
  }, [dwellMs, enabled, focused, hidden, offscreen, itemIds.length])

  // Back on screen: restart the current item so it gets its full dwell, in
  // step with content (e.g. a scroll) that restarts when it comes into view.
  const wasOffscreenRef = useRef(offscreen)
  useEffect(() => {
    const was = wasOffscreenRef.current
    wasOffscreenRef.current = offscreen
    if (!enabled || !was || offscreen) return
    stateRef.current = resumeUnattendedSequence(stateRef.current, Date.now())
    setRestarts(stateRef.current.restarts)
    setProgress(0)
  }, [enabled, offscreen])

  const handleFocus = useCallback<FocusEventHandler<HTMLElement>>(() => {
    setFocused(true)
  }, [])
  const handleBlur = useCallback<FocusEventHandler<HTMLElement>>((event) => {
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.contains(next)) return
    setFocused(false)
  }, [])

  const pauseReasons = useMemo(() => {
    const reasons: UnattendedPauseReason[] = []
    if (focused) reasons.push("focus")
    if (hidden || offscreen) reasons.push("hidden")
    return reasons
  }, [focused, hidden, offscreen])

  return {
    index,
    itemId,
    progress,
    started,
    restarts,
    pauseReasons,
    handleFocus,
    handleBlur,
  }
}
