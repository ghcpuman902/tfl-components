"use client"

import { useEffect, useRef, type RefObject } from "react"
import { ArrowUp, CirclePlus } from "lucide-react"

const FINE_POINTER = "(hover: hover) and (pointer: fine)"
const CHROME_SELECTOR =
  "a, button, input, label, textarea, [data-landing-chrome]"

type IpadAimCursorProps = {
  hostRef: RefObject<HTMLElement | null>
  targetRef: RefObject<SVGGraphicsElement | null>
  enabled: boolean
}

const containsPoint = (rect: DOMRect, x: number, y: number) =>
  x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom

export const IpadAimCursor = ({
  hostRef,
  targetRef,
  enabled,
}: IpadAimCursorProps) => {
  const cursorRef = useRef<HTMLDivElement>(null)
  const arrowRef = useRef<HTMLDivElement>(null)
  const plusRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    const cursor = cursorRef.current
    const arrow = arrowRef.current
    const plus = plusRef.current
    if (!enabled || !host || !cursor || !arrow || !plus) return

    const media = window.matchMedia(FINE_POINTER)
    let finePointer = media.matches
    let visible = false
    let overChrome = false
    let pointerX = 0
    let pointerY = 0
    let frame = 0

    const setHostCursor = () => {
      host.classList.toggle("cursor-none", finePointer)
    }

    const paint = () => {
      const show = finePointer && visible && !overChrome
      cursor.style.opacity = show ? "1" : "0"
      cursor.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0) translate(-50%, -50%)`

      if (!show) return

      const target = targetRef.current
      if (!target) return
      const rect = target.getBoundingClientRect()
      const overTarget = containsPoint(rect, pointerX, pointerY)
      arrow.style.opacity = overTarget ? "0" : "1"
      plus.style.opacity = overTarget ? "1" : "0"

      if (overTarget) return
      const angle =
        (Math.atan2(
          rect.left + rect.width / 2 - pointerX,
          -(rect.top + rect.height / 2 - pointerY)
        ) *
          180) /
        Math.PI
      arrow.style.transform = `rotate(${angle}deg)`
    }

    const handlePointerMove = (event: PointerEvent) => {
      pointerX = event.clientX
      pointerY = event.clientY
      visible = true
      overChrome = Boolean(
        event.target instanceof Element && event.target.closest(CHROME_SELECTOR)
      )
    }

    const handlePointerEnter = () => {
      visible = true
    }

    const handlePointerLeave = (event: PointerEvent) => {
      if (
        event.relatedTarget instanceof Node &&
        host.contains(event.relatedTarget)
      ) {
        return
      }
      visible = false
      overChrome = false
    }

    const tick = () => {
      paint()
      frame = window.requestAnimationFrame(tick)
    }

    const handleMediaChange = () => {
      finePointer = media.matches
      setHostCursor()
      if (!finePointer) {
        visible = false
        paint()
      }
    }

    setHostCursor()
    paint()
    frame = window.requestAnimationFrame(tick)
    host.addEventListener("pointermove", handlePointerMove)
    host.addEventListener("pointerenter", handlePointerEnter)
    host.addEventListener("pointerleave", handlePointerLeave)
    media.addEventListener("change", handleMediaChange)

    return () => {
      window.cancelAnimationFrame(frame)
      host.removeEventListener("pointermove", handlePointerMove)
      host.removeEventListener("pointerenter", handlePointerEnter)
      host.removeEventListener("pointerleave", handlePointerLeave)
      media.removeEventListener("change", handleMediaChange)
      host.classList.remove("cursor-none")
    }
  }, [enabled, hostRef, targetRef])

  if (!enabled) return null

  return (
    <div
      ref={cursorRef}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-40 size-8 text-white opacity-0 [@media(hover:hover)_and_(pointer:fine)]:block"
    >
      <div
        ref={arrowRef}
        className="absolute inset-0 grid place-items-center motion-safe:transition-opacity motion-safe:duration-150 motion-safe:ease"
      >
        <ArrowUp className="size-7" strokeWidth={2.25} />
      </div>
      <div
        ref={plusRef}
        className="absolute inset-0 grid place-items-center opacity-0 motion-safe:transition-opacity motion-safe:duration-150 motion-safe:ease"
      >
        <CirclePlus className="size-7" strokeWidth={2.25} />
      </div>
    </div>
  )
}
