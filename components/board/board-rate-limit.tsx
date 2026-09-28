"use client"

import { BoardModeRoundel } from "@/components/board/board-mode-roundel"
import { Button } from "@/components/ui/button"
import {
  BOARD_RATE_LIMIT_BODY,
  BOARD_RATE_LIMIT_RETRY,
  BOARD_RATE_LIMIT_TITLE,
} from "@/lib/tfl/board-rate-limit"

type BoardRateLimitScreenProps = {
  onRetry: () => void
  retrying?: boolean
}

export const BoardRateLimitScreen = ({
  onRetry,
  retrying = false,
}: BoardRateLimitScreenProps) => {
  const handleRetry = () => {
    if (retrying) return
    onRetry()
  }

  return (
    <div className="flex w-full flex-col items-center justify-center px-6 py-10 text-center pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4">
        <BoardModeRoundel variant="tfl" className="size-8" />
        <div className="space-y-2">
          <h1
            id="board-rate-limit-title"
            className="tfl-title text-2xl text-balance text-foreground sm:text-3xl"
          >
            {BOARD_RATE_LIMIT_TITLE}
          </h1>
          <p className="text-sm text-pretty text-muted-foreground sm:text-base">
            {BOARD_RATE_LIMIT_BODY}
          </p>
        </div>
        <Button
          type="button"
          className="mt-2 min-h-11 w-full sm:w-auto"
          onClick={handleRetry}
          disabled={retrying}
          aria-busy={retrying || undefined}
        >
          {retrying ? "Trying again…" : BOARD_RATE_LIMIT_RETRY}
        </Button>
      </div>
    </div>
  )
}
