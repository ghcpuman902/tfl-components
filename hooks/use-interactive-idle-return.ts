"use client"

import {
  useCallback,
  useEffect,
  useRef,
  type FocusEventHandler,
  type KeyboardEventHandler,
  type PointerEventHandler,
  type UIEventHandler,
} from "react"
import {
  INTERACTIVE_IDLE_RETURN_MS,
  createIdleReturnState,
  registerIdleActivity,
  resumeIdleReturn,
  shouldReturnToFirstPage,
  suspendIdleReturn,
} from "@/lib/tfl/interactive-idle-return"

export type UseInteractiveIdleReturnOptions = {
  enabled?: boolean
  idleMs?: number
  onReturnToFirst: () => void
}

export type UseInteractiveIdleReturnResult = {
  handleActivity: () => void
  handlePointerEnter: PointerEventHandler<HTMLElement>
  handlePointerLeave: PointerEventHandler<HTMLElement>
  handlePointerDown: PointerEventHandler<HTMLElement>
  handleFocus: FocusEventHandler<HTMLElement>
  handleBlur: FocusEventHandler<HTMLElement>
  handleKeyDown: KeyboardEventHandler<HTMLElement>
  handleScroll: UIEventHandler<HTMLElement>
}

/**
 * After inactivity on a non-first interactive page, return to page 1.
 * Hover and focus suspend the countdown so a reader mid-navigation is not
 * yanked back. Pointer, swipe, click, and keyboard activity reset the timer.
 */
export const useInteractiveIdleReturn = ({
  enabled = true,
  idleMs = INTERACTIVE_IDLE_RETURN_MS,
  onReturnToFirst,
}: UseInteractiveIdleReturnOptions): UseInteractiveIdleReturnResult => {
  const stateRef = useRef(createIdleReturnState(0))
  const hoveringRef = useRef(false)
  const focusedRef = useRef(false)
  const onReturnRef = useRef(onReturnToFirst)

  useEffect(() => {
    onReturnRef.current = onReturnToFirst
  }, [onReturnToFirst])

  useEffect(() => {
    if (!enabled) return
    stateRef.current = createIdleReturnState(Date.now())
  }, [enabled, idleMs])

  useEffect(() => {
    if (!enabled) return

    const tick = () => {
      if (
        shouldReturnToFirstPage(stateRef.current, Date.now(), idleMs)
      ) {
        stateRef.current = registerIdleActivity(Date.now())
        onReturnRef.current()
      }
    }

    const interval = window.setInterval(tick, 250)
    return () => window.clearInterval(interval)
  }, [enabled, idleMs])

  const syncSuspended = useCallback((nowMs: number) => {
    if (hoveringRef.current || focusedRef.current) {
      stateRef.current = suspendIdleReturn(stateRef.current)
      return
    }
    stateRef.current = resumeIdleReturn(stateRef.current, nowMs)
  }, [])

  const handleActivity = useCallback(() => {
    if (!enabled) return
    if (hoveringRef.current || focusedRef.current) {
      stateRef.current = suspendIdleReturn(stateRef.current)
      return
    }
    stateRef.current = registerIdleActivity(Date.now())
  }, [enabled])

  const handlePointerEnter = useCallback<PointerEventHandler<HTMLElement>>(
    () => {
      hoveringRef.current = true
      syncSuspended(Date.now())
    },
    [syncSuspended]
  )
  const handlePointerLeave = useCallback<PointerEventHandler<HTMLElement>>(
    () => {
      hoveringRef.current = false
      syncSuspended(Date.now())
    },
    [syncSuspended]
  )
  const handlePointerDown = useCallback<PointerEventHandler<HTMLElement>>(
    () => {
      handleActivity()
    },
    [handleActivity]
  )
  const handleFocus = useCallback<FocusEventHandler<HTMLElement>>(() => {
    focusedRef.current = true
    syncSuspended(Date.now())
  }, [syncSuspended])
  const handleBlur = useCallback<FocusEventHandler<HTMLElement>>((event) => {
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.contains(next)) return
    focusedRef.current = false
    syncSuspended(Date.now())
  }, [syncSuspended])
  const handleKeyDown = useCallback<KeyboardEventHandler<HTMLElement>>(
    () => {
      handleActivity()
    },
    [handleActivity]
  )
  const handleScroll = useCallback<UIEventHandler<HTMLElement>>(() => {
    handleActivity()
  }, [handleActivity])

  return {
    handleActivity,
    handlePointerEnter,
    handlePointerLeave,
    handlePointerDown,
    handleFocus,
    handleBlur,
    handleKeyDown,
    handleScroll,
  }
}
