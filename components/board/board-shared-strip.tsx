"use client"

import Link from "next/link"
import { XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

/** One-time strip on a Board opened from someone's short link. */
export const BoardSharedStrip = ({
  editHref,
  onDismiss,
}: {
  editHref: string
  onDismiss: () => void
}) => (
  <aside className="mb-4 flex items-center gap-3 rounded-xl bg-muted px-4 py-3">
    <p className="min-w-0 flex-1 text-sm text-balance">
      Someone shared this live board.{" "}
      <span className="text-muted-foreground">Free, no app, no sign-in.</span>
    </p>
    <Button
      nativeButton={false}
      size="lg"
      className="h-10 shrink-0 rounded-full px-4"
      render={<Link href={editHref} onClick={onDismiss} />}
    >
      Make your own
    </Button>
    <button
      type="button"
      onClick={onDismiss}
      aria-label="Dismiss"
      className="-mr-1 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
    >
      <XIcon className="size-4" />
    </button>
  </aside>
)
