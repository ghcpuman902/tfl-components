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

type ExplorerSplitProps = {
  lead: ReactNode;
  inspector: ReactNode;
  className?: string;
};

/**
 * Pair a finder and inspector at equal height on large screens.
 * Both columns share `explorerSplitHeightClassName` and scroll internally.
 */
export const ExplorerSplit = ({
  lead,
  inspector,
  className,
}: ExplorerSplitProps) => (
  <div
    className={cn(
      "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-stretch",
      className,
    )}
  >
    <div
      className={cn(
        "flex min-h-0 flex-col",
        explorerSplitHeightClassName,
      )}
    >
      {lead}
    </div>
    <div className={cn("min-h-0 min-w-0", explorerSplitHeightClassName)}>
      {inspector}
    </div>
  </div>
);
