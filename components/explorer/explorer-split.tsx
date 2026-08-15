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

/** Shared desktop height so finder and inspector cards align. */
export const explorerSplitHeightClassName = "lg:h-[min(40rem,70svh)]";

/**
 * Results list / map: capped when stacked, fills the split column at `lg`.
 * `lg:h-0` + `flex-1` avoids a leftover used height when shrinking below `lg`.
 */
export const explorerResultsPaneClassName =
  "h-112 min-h-0 min-w-0 max-sm:h-[calc(100svh/3)] lg:h-0 lg:flex-1";

type ExplorerSplitProps = {
  lead: ReactNode;
  inspector: ReactNode;
  className?: string;
};

/**
 * Pair a finder and inspector at equal height on large screens.
 * Height lives on the grid so stacked layouts do not keep a desktop used height.
 */
export const ExplorerSplit = ({
  lead,
  inspector,
  className,
}: ExplorerSplitProps) => (
  <div
    className={cn(
      "grid min-w-0 gap-6 lg:grid-cols-2 lg:items-stretch",
      explorerSplitHeightClassName,
      className,
    )}
  >
    <div className="flex min-h-0 min-w-0 flex-col">{lead}</div>
    <div className="min-h-0 min-w-0">{inspector}</div>
  </div>
);
