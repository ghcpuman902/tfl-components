"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type DocsResizeFrameProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Starting width in px. */
  defaultWidth: number;
  minWidth?: number;
  maxWidth?: number;
  /** Extra caption after the width readout (e.g. " · resize to see it in action"). */
  captionSuffix?: string;
  onWidthChange?: (width: number) => void;
};

/**
 * Docs demo frame that resizes on desktop via the CSS corner grip, and on
 * touch / narrow viewports via a thumb-sized floating handle.
 */
export const DocsResizeFrame = ({
  children,
  className,
  style,
  defaultWidth,
  minWidth = 120,
  maxWidth,
  captionSuffix,
  onWidthChange,
}: DocsResizeFrameProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(defaultWidth);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (next == null) return;
      const rounded = Math.round(next);
      setWidth(rounded);
      onWidthChange?.(rounded);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [onWidthChange]);

  const clampWidth = (value: number) => {
    const cap = maxWidth ?? Number.POSITIVE_INFINITY;
    return Math.min(cap, Math.max(minWidth, value));
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    const el = panelRef.current;
    if (!el) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      startX: event.clientX,
      startWidth: el.getBoundingClientRect().width,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    const el = panelRef.current;
    if (!drag || !el) return;

    const next = clampWidth(drag.startWidth + (event.clientX - drag.startX));
    el.style.width = `${Math.round(next)}px`;
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative w-fit max-w-full">
        <div
          ref={panelRef}
          className={cn(
            "max-w-full overflow-auto border border-border bg-background max-md:resize-none md:resize-x",
            className,
          )}
          style={{ width: defaultWidth, ...style }}
        >
          {children}
        </div>
        <button
          type="button"
          aria-label="Drag to resize"
          className={cn(
            "absolute top-1/2 right-0 z-10 flex h-11 w-7 -translate-y-1/2 translate-x-1/2 touch-none items-center justify-center rounded-md border border-border bg-background shadow-sm",
            "md:hidden",
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <span
            aria-hidden
            className="grid grid-cols-2 gap-0.5 text-muted-foreground"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <span
                key={index}
                className="size-1 rounded-full bg-current opacity-70"
              />
            ))}
          </span>
        </button>
      </div>
      <p className="text-xs tabular-nums text-muted-foreground">
        {width}px{captionSuffix}
      </p>
    </div>
  );
};
