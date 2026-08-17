"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEventHandler,
  type PointerEventHandler,
} from "react"
import {
  UNATTENDED_DEFAULT_DWELL_MS,
  createUnattendedSequence,
  isDocumentHidden,
  reconcileUnattendedSequence,
  resumeUnattendedSequence,
  tickUnattendedSequence,
  type UnattendedPauseReason,
} from "@/lib/tfl/unattended-sequence"

export type UseUnattendedSequenceOptions = {
  itemIds: readonly string[]
  dwellMs?: number
  /** Stagger this panel against others on the same board. */
  startDelayMs?: number
  enabled?: boolean
}

export type UseUnattendedSequenceResult = {
  index: number
  itemId: string | null
  pauseReasons: readonly UnattendedPauseReason[]
  handlePointerEnter: PointerEventHandler<HTMLElement>
  handlePointerLeave: PointerEventHandler<HTMLElement>
  handleFocus: FocusEventHandler<HTMLElement>
  handleBlur: FocusEventHandler<HTMLElement>
}

const idsKey = (ids: readonly string[]) => ids.join("\0")

/** Reduced motion does not pause the sequence — paint stays instant. */
export const useUnattendedSequence = ({
  itemIds,
  dwellMs = UNATTENDED_DEFAULT_DWELL_MS,
  startDelayMs = 0,
  enabled = true,
}: UseUnattendedSequenceOptions): UseUnattendedSequenceResult => {
  const itemKey = idsKey(itemIds)

  const [index, setIndex] = useState(0)
  const [itemId, setItemId] = useState<string | null>(itemIds[0] ?? null)
  const [hovering, setHovering] = useState(false)
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
    setIndex(stateRef.current.index)
    setItemId(stateRef.current.itemId)
  }, [enabled, startDelayMs])

  useEffect(() => {
    if (!enabled) return
    const next = reconcileUnattendedSequence(stateRef.current, itemIds)
    stateRef.current = next
    setIndex(next.index)
    setItemId(next.itemId)
  }, [enabled, itemKey, itemIds])

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
        }
        return nextHidden
      })
    }

    syncHidden()
    document.addEventListener("visibilitychange", syncHidden)
    return () => document.removeEventListener("visibilitychange", syncHidden)
  }, [enabled])

  useEffect(() => {
    if (!enabled || itemIds.length <= 1) return

    const tick = () => {
      const pauseReasons: UnattendedPauseReason[] = []
      if (hovering) pauseReasons.push("hover")
      if (focused) pauseReasons.push("focus")
      if (hidden) pauseReasons.push("hidden")
      const next = tickUnattendedSequence(stateRef.current, {
        itemIds: itemIdsRef.current,
        nowMs: Date.now(),
        dwellMs,
        pauseReasons,
      })
      stateRef.current = next
      setIndex(next.index)
      setItemId(next.itemId)
    }

    const interval = window.setInterval(tick, 250)
    return () => window.clearInterval(interval)
  }, [dwellMs, enabled, focused, hidden, hovering, itemIds.length])

  const handlePointerEnter = useCallback<PointerEventHandler<HTMLElement>>(
    () => {
      setHovering(true)
    },
    []
  )
  const handlePointerLeave = useCallback<PointerEventHandler<HTMLElement>>(
    () => {
      setHovering(false)
    },
    []
  )
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
    if (hovering) reasons.push("hover")
    if (focused) reasons.push("focus")
    if (hidden) reasons.push("hidden")
    return reasons
  }, [focused, hidden, hovering])

  return {
    index,
    itemId,
    pauseReasons,
    handlePointerEnter,
    handlePointerLeave,
    handleFocus,
    handleBlur,
  }
}
