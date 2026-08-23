"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BOARD_PATH } from "@/lib/tfl/board-url-state"

export const BoardViewSetupPrompt = () => (
  <div className="flex max-w-md flex-col gap-4">
    <div className="space-y-2">
      <h1 className="font-heading text-lg font-medium text-foreground">
        This board has not been set up
      </h1>
      <p className="text-sm text-muted-foreground">
        Choose a stop and create a Board link.
      </p>
    </div>
    <Button nativeButton={false} render={<Link href={BOARD_PATH} />}>
      Set up a board
    </Button>
  </div>
)
