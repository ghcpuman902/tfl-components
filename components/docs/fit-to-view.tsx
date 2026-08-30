"use client"

import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

type FitToViewProps = {
  fit: boolean
  /** `width` scales to the container width. `box` also respects max-height. */
  mode: "width" | "box"
  className?: string
  children: ReactNode
}

const readHeightBudget = (element: HTMLElement): number | null => {
  const maxHeight = parseFloat(getComputedStyle(element).maxHeight)
  if (!Number.isFinite(maxHeight) || maxHeight <= 0) return null
  return maxHeight
}

export const fitToViewScale = (
  contentWidth: number,
  contentHeight: number,
  viewportWidth: number,
  heightBudget: number | null
): number => {
  if (contentWidth <= 0 || viewportWidth <= 0) return 1
  const widthScale = viewportWidth / contentWidth
  if (heightBudget == null || heightBudget <= 0 || contentHeight <= 0) {
    return Math.min(1, widthScale)
  }
  return Math.min(1, widthScale, heightBudget / contentHeight)
}

/**
 * Viewing chrome: scale a diagram down so it fits the space it sits in.
 * Does not change layout geometry — ticks, rings, and labels stay in proportion.
 */
export const FitToView = ({
  fit,
  mode,
  className,
  children,
}: FitToViewProps) => {
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [fittedHeight, setFittedHeight] = useState(0)
  const [offsetX, setOffsetX] = useState(0)

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const content = contentRef.current
    if (!viewport || !content) return

    const update = () => {
      if (!fit) {
        setScale(1)
        setFittedHeight(0)
        setOffsetX(0)
        return
      }
      const nextScale = fitToViewScale(
        content.offsetWidth,
        content.offsetHeight,
        viewport.clientWidth,
        mode === "box" ? readHeightBudget(viewport) : null
      )
      const visualWidth = content.offsetWidth * nextScale
      setScale(nextScale)
      setFittedHeight(content.offsetHeight * nextScale)
      setOffsetX(
        mode === "box" ? Math.max(0, (viewport.clientWidth - visualWidth) / 2) : 0
      )
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(viewport)
    observer.observe(content)
    return () => observer.disconnect()
  }, [fit, mode])

  return (
    <div
      ref={viewportRef}
      className={cn(
        "relative w-full min-w-0",
        className,
        fit && "overflow-hidden"
      )}
    >
      <div
        style={
          fit && fittedHeight > 0 ? { height: fittedHeight } : undefined
        }
      >
        <div
          ref={contentRef}
          className={fit ? "w-max max-w-none" : undefined}
          style={
            fit
              ? {
                  transform: `translateX(${offsetX}px) scale(${scale})`,
                  transformOrigin: "top left",
                }
              : undefined
          }
        >
          {children}
        </div>
      </div>
    </div>
  )
}
