"use client"

import { useEffect, useRef, type RefObject } from "react"
import {
  DEFAULT_PEEK,
  peekPanByPixels,
  peekScaleAboutPoint,
  phoneDollyFromPinch,
  sanitizePeek,
  touchDistance,
  touchMidpoint,
  type PeekState,
} from "./room-peek"

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const hasFinePointer = () => window.matchMedia("(pointer: fine)").matches

type ParallaxValue = {
  x: number
  y: number
}

type UseParallaxInputArgs = {
  stageRef: RefObject<HTMLElement | null>
  enabled: boolean
  /**
   * Phone canvas: pinch moves the room camera between the framed iPad (0)
   * and the pulled-back room (1). Peek scale stays at rest so the tablet
   * cannot be scaled out of frame.
   */
  phoneDollyRef?: RefObject<number>
  onPhoneDolly?: (progress: number) => void
}

/** Controls and page chrome. The framed board is not a control: two-finger pinch on it zooms the room. */
const isLandingControlTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest("[data-landing-chrome], a, button, input, textarea, select")
  )
}

/** Single-finger drags on the live board stay with the board (scroll), not room parallax. */
const isExampleBoardTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest("#landing-example-board"))
}

const isPeekSurfaceTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest("[data-landing-peek-surface]"))
}

/**
 * Desktop: pointer position over the stage drives parallax.
 * Mobile: single-finger drag looks around; pinch peeks into the room.
 * Device-orientation "Unlock motion" is intentionally omitted — drag is
 * the discoverable control.
 *
 * Two-finger gestures are consumed in the capture phase, including at the
 * minimum peek scale, so iOS Safari does not turn a pinch-out into the
 * tab overview. One-finger moves at rest scale are left to the page and
 * the board.
 */
export const useParallaxInput = ({
  stageRef,
  enabled,
  phoneDollyRef,
  onPhoneDolly,
}: UseParallaxInputArgs) => {
  const valueRef = useRef<ParallaxValue>({ x: 0, y: 0 })
  const peekRef = useRef<PeekState>({ ...DEFAULT_PEEK })
  const pointerActiveRef = useRef(false)
  const dragPointerIdRef = useRef<number | null>(null)
  const dragLastRef = useRef<{ x: number; y: number } | null>(null)
  const pinchRef = useRef<{
    startDistance: number
    startScale: number
    startDolly: number
  } | null>(null)

  useEffect(() => {
    if (!enabled) {
      valueRef.current.x = 0
      valueRef.current.y = 0
      peekRef.current = { ...DEFAULT_PEEK }
      pointerActiveRef.current = false
      dragPointerIdRef.current = null
      dragLastRef.current = null
      pinchRef.current = null
      return
    }

    const stagePoint = (clientX: number, clientY: number) => {
      const stage = stageRef.current
      if (!stage) return null
      const rect = stage.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return null
      return {
        rect,
        nx: clamp(((clientX - rect.left) / rect.width) * 2 - 1, -1, 1),
        ny: clamp(((clientY - rect.top) / rect.height) * 2 - 1, -1, 1),
      }
    }

    const applyLook = (clientX: number, clientY: number) => {
      const point = stagePoint(clientX, clientY)
      if (!point) return
      valueRef.current.x = point.nx
      valueRef.current.y = point.ny
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (pinchRef.current) return

      if (hasFinePointer()) {
        const stage = stageRef.current
        if (!stage) return
        const rect = stage.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) return
        const inside =
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        if (!inside) {
          pointerActiveRef.current = false
          valueRef.current.y = 0
          valueRef.current.x = 0
          return
        }
        pointerActiveRef.current = true
        applyLook(event.clientX, event.clientY)
        return
      }

      if (dragPointerIdRef.current !== event.pointerId) return
      pointerActiveRef.current = true

      if (peekRef.current.scale > 1.01 && dragLastRef.current) {
        const stage = stageRef.current
        const rect = stage?.getBoundingClientRect()
        if (rect && rect.width > 0 && rect.height > 0) {
          peekRef.current = peekPanByPixels({
            peek: peekRef.current,
            dx: event.clientX - dragLastRef.current.x,
            dy: event.clientY - dragLastRef.current.y,
            rectWidth: rect.width,
            rectHeight: rect.height,
          })
        }
        dragLastRef.current = { x: event.clientX, y: event.clientY }
        // Soft look follow while panning a zoomed peek.
        applyLook(event.clientX, event.clientY)
        return
      }

      applyLook(event.clientX, event.clientY)
      dragLastRef.current = { x: event.clientX, y: event.clientY }
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (hasFinePointer()) return
      if (event.pointerType === "mouse") return
      if (
        isLandingControlTarget(event.target) ||
        isExampleBoardTarget(event.target)
      ) {
        return
      }
      // Prefer the dedicated peek surface; fall back to stage bounds for
      // older layouts / temp routes without the hit layer.
      if (!isPeekSurfaceTarget(event.target)) {
        const stage = stageRef.current
        if (!stage) return
        const rect = stage.getBoundingClientRect()
        const inside =
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        if (!inside) return
      }

      dragPointerIdRef.current = event.pointerId
      dragLastRef.current = { x: event.clientX, y: event.clientY }
      pointerActiveRef.current = true
      applyLook(event.clientX, event.clientY)
    }

    const endDrag = (pointerId: number) => {
      if (dragPointerIdRef.current !== pointerId) return
      dragPointerIdRef.current = null
      dragLastRef.current = null
      pointerActiveRef.current = false
      valueRef.current.x = 0
      valueRef.current.y = 0
    }

    const handlePointerUp = (event: PointerEvent) => {
      endDrag(event.pointerId)
    }

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length < 2) return
      // Capture + preventDefault before Safari treats pinch-out at min
      // scale as the multi-tab gesture. Still preventDefault when the
      // pinch starts on a control or outside the stage.
      event.preventDefault()
      if (event.touches.length !== 2) {
        pinchRef.current = null
        return
      }
      if (isLandingControlTarget(event.target)) return
      const stage = stageRef.current
      if (!stage) return
      const rect = stage.getBoundingClientRect()
      const mid = touchMidpoint(event.touches[0]!, event.touches[1]!)
      const inside =
        mid.x >= rect.left &&
        mid.x <= rect.right &&
        mid.y >= rect.top &&
        mid.y <= rect.bottom
      if (!inside) return

      dragPointerIdRef.current = null
      dragLastRef.current = null
      pinchRef.current = {
        startDistance: touchDistance(event.touches[0]!, event.touches[1]!),
        startScale: peekRef.current.scale,
        startDolly: phoneDollyRef?.current ?? 0,
      }
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length >= 2) {
        event.preventDefault()
      }

      const pinch = pinchRef.current
      if (pinch && event.touches.length === 2) {
        const stage = stageRef.current
        if (!stage) return
        const rect = stage.getBoundingClientRect()
        const distance = touchDistance(event.touches[0]!, event.touches[1]!)
        if (!(pinch.startDistance > 0) || !(distance > 0)) return
        if (onPhoneDolly) {
          onPhoneDolly(
            phoneDollyFromPinch(pinch.startDolly, pinch.startDistance, distance)
          )
          return
        }
        const mid = touchMidpoint(event.touches[0]!, event.touches[1]!)
        peekRef.current = peekScaleAboutPoint({
          peek: peekRef.current,
          nextScale: pinch.startScale * (distance / pinch.startDistance),
          pointX: mid.x,
          pointY: mid.y,
          rectLeft: rect.left,
          rectTop: rect.top,
          rectWidth: rect.width,
          rectHeight: rect.height,
        })
        return
      }

      // While zoomed, one-finger drag owns the gesture so pan-y does not
      // steal the peek pan.
      if (
        event.touches.length === 1 &&
        peekRef.current.scale > 1.01 &&
        dragPointerIdRef.current != null
      ) {
        event.preventDefault()
      }
    }

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length >= 2) return
      pinchRef.current = null
      peekRef.current = sanitizePeek(peekRef.current)
    }

    const handleGesture = (event: Event) => {
      event.preventDefault()
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    window.addEventListener("pointerdown", handlePointerDown, { passive: true })
    window.addEventListener("pointerup", handlePointerUp, { passive: true })
    window.addEventListener("pointercancel", handlePointerUp, { passive: true })
    window.addEventListener("touchstart", handleTouchStart, {
      passive: false,
      capture: true,
    })
    window.addEventListener("touchmove", handleTouchMove, {
      passive: false,
      capture: true,
    })
    window.addEventListener("touchend", handleTouchEnd, { passive: true })
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true })
    document.addEventListener("gesturestart", handleGesture, {
      passive: false,
      capture: true,
    })
    document.addEventListener("gesturechange", handleGesture, {
      passive: false,
      capture: true,
    })

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerdown", handlePointerDown)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerUp)
      window.removeEventListener("touchstart", handleTouchStart, {
        capture: true,
      })
      window.removeEventListener("touchmove", handleTouchMove, {
        capture: true,
      })
      window.removeEventListener("touchend", handleTouchEnd)
      window.removeEventListener("touchcancel", handleTouchEnd)
      document.removeEventListener("gesturestart", handleGesture, {
        capture: true,
      })
      document.removeEventListener("gesturechange", handleGesture, {
        capture: true,
      })
    }
  }, [enabled, onPhoneDolly, phoneDollyRef, stageRef])

  return {
    valueRef,
    peekRef,
  }
}
