"use client"

import Link from "next/link"
import { XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { BoardTopCardParts } from "@/lib/tfl/board-shared-arrival"

/** The one closable card at the top of a Board: shared-link welcome and/or the iOS Home Screen tip. */
export const BoardSharedStrip = ({
  parts,
  editHref,
  onDismiss,
}: {
  parts: BoardTopCardParts
  editHref: string
  onDismiss: () => void
}) => (
  <aside className="mb-4 rounded-xl bg-muted px-4 py-3">
    <div className="flex items-center gap-3">
      <p className="min-w-0 flex-1 text-sm text-balance">
        {parts.shared ? (
          <>
            Someone shared this live board.{" "}
            <span className="text-muted-foreground">
              Free, no app, no sign-in.
            </span>
          </>
        ) : (
          <>
            Use this board full screen.{" "}
            <span className="text-muted-foreground">
              Tap Share, then Add to Home Screen.
            </span>
          </>
        )}
      </p>
      {parts.shared ? (
        <Button
          nativeButton={false}
          size="lg"
          className="h-10 shrink-0 rounded-full px-4"
          render={<Link href={editHref} onClick={onDismiss} />}
        >
          Make your own
        </Button>
      ) : null}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-mr-1 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
      >
        <XIcon className="size-4" />
      </button>
    </div>
    {parts.shared && parts.homeScreen ? (
      <p className="mt-1 text-sm text-balance text-muted-foreground">
        Use this board full screen. Tap Share, then Add to Home Screen.
      </p>
    ) : null}
  </aside>
)
