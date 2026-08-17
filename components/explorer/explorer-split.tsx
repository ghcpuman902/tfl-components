import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Outer list / inspector chrome — same radius on both columns. */
export const explorerPaneClassName = "rounded-xl border border-border";

/**
 * Nested radius for items inset by `p-1` inside a `rounded-xl` pane.
 * `--radius-xl` minus 0.25rem matches `--radius` / `rounded-lg`.
 */
export const explorerPaneItemClassName =
  "rounded-[calc(var(--radius-xl)-0.25rem)]";

/**
 * Two columns when *this* pane is wide enough — docs sidebar / TOC can wrap
 * the inspector under the finder before the viewport hits `lg`.
 */
export const explorerSplitFillClassName = "@min-[48rem]/explorer:h-full";

/** Shared height so finder and inspector cards align when side by side. */
export const explorerSplitHeightClassName =
  "@min-[48rem]/explorer:h-[min(40rem,70svh)]";

/**
 * Results list / map: one-third of the viewport (capped at 28rem) as soon as
 * the inspector wraps under. Side by side, fill the split column instead.
 */
export const explorerResultsPaneClassName =
  "h-[min(28rem,calc(100svh/3))] min-h-0 min-w-0 overscroll-y-auto @min-[48rem]/explorer:h-0 @min-[48rem]/explorer:flex-1";

type ExplorerSplitProps = {
  lead: ReactNode;
  inspector: ReactNode;
  className?: string;
};

/**
 * Pair a finder and inspector at equal height when they sit side by side.
 * Height lives on the grid so a wrapped inspector does not keep a used height.
 */
export const ExplorerSplit = ({
  lead,
  inspector,
  className,
}: ExplorerSplitProps) => (
  <div className="@container/explorer min-w-0">
    <div
      className={cn(
        "grid min-w-0 gap-6 @min-[48rem]/explorer:grid-cols-2 @min-[48rem]/explorer:items-stretch",
        explorerSplitHeightClassName,
        className,
      )}
    >
      <div className="flex min-h-0 min-w-0 flex-col">{lead}</div>
      <div className="min-h-0 min-w-0">{inspector}</div>
    </div>
  </div>
);
