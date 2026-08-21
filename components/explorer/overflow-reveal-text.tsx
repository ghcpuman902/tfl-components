"use client"

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type OverflowRevealTextProps = {
  text: string
  href?: string
  className?: string
}

/** ~70px/s — duration scales with overflow so long names don’t rush. */
const REVEAL_PX_PER_SECOND = 70
const REVEAL_MIN_MS = 450
const REVEAL_MAX_MS = 1800

const revealDurationMs = (overflowPx: number): number => {
  if (overflowPx <= 0) return 0
  return Math.min(
    REVEAL_MAX_MS,
    Math.max(REVEAL_MIN_MS, (overflowPx / REVEAL_PX_PER_SECOND) * 1000)
  )
}

const paintClassName = (canReveal: boolean) =>
  cn(
    "inline-block whitespace-nowrap",
    canReveal &&
      "motion-safe:group-hover/reveal:translate-x-(--overflow-reveal-x) motion-safe:group-hover/reveal:transition-transform motion-safe:group-hover/reveal:duration-(--overflow-reveal-ms) motion-safe:group-hover/reveal:ease-linear motion-safe:group-focus-visible/reveal:translate-x-(--overflow-reveal-x) motion-safe:group-focus-visible/reveal:transition-transform motion-safe:group-focus-visible/reveal:duration-(--overflow-reveal-ms) motion-safe:group-focus-visible/reveal:ease-linear"
  )

/**
 * Clip overflowing single-line text. On pointer hover / keyboard focus the
 * inner paint slides left to reveal the rest (Apple Music / ChatGPT sidebar),
 * then snaps back on leave. Reduced motion keeps the clip and a `title`.
 */
export const OverflowRevealText = ({
  text,
  href,
  className,
}: OverflowRevealTextProps) => {
  const linkRef = useRef<HTMLAnchorElement>(null)
  const spanRef = useRef<HTMLSpanElement>(null)
  const innerRef = useRef<HTMLSpanElement>(null)
  const [overflowPx, setOverflowPx] = useState(0)

  useLayoutEffect(() => {
    const outer = linkRef.current ?? spanRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    const measure = () => {
      setOverflowPx(Math.max(0, inner.scrollWidth - outer.clientWidth))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(outer)
    return () => observer.disconnect()
  }, [href, text])

  const canReveal = overflowPx > 0
  const durationMs = revealDurationMs(overflowPx)

  const inner = (
    <span ref={innerRef} className={paintClassName(canReveal)}>
      {text}
    </span>
  )

  const sharedClassName = cn(
    "group/reveal block min-w-0 overflow-hidden",
    canReveal &&
      "[mask-image:linear-gradient(to_right,#000_calc(100%-1.25rem),transparent)] hover:[mask-image:none] focus-visible:[mask-image:none]",
    href &&
      "rounded-sm underline-offset-4 focus-visible:underline focus-visible:outline-none",
    className
  )
  const sharedStyle = canReveal
    ? ({
        "--overflow-reveal-x": `-${overflowPx}px`,
        "--overflow-reveal-ms": `${durationMs}ms`,
      } as CSSProperties)
    : undefined
  const title = canReveal ? text : undefined

  if (href) {
    return (
      <Link
        ref={linkRef}
        href={href}
        title={title}
        className={sharedClassName}
        style={sharedStyle}
      >
        {inner}
      </Link>
    )
  }

  return (
    <span
      ref={spanRef}
      title={title}
      className={sharedClassName}
      style={sharedStyle}
    >
      {inner}
    </span>
  )
}
