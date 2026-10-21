"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const DEMO_NOTICE_DISMISS_KEY = "tfl-board-demo-notice-dismissed"

export const readDemoNoticeDismissed = (): boolean => {
  try {
    return window.sessionStorage.getItem(DEMO_NOTICE_DISMISS_KEY) === "1"
  } catch {
    return false
  }
}

export const writeDemoNoticeDismissed = (): void => {
  try {
    window.sessionStorage.setItem(DEMO_NOTICE_DISMISS_KEY, "1")
  } catch {
    // Private mode: the notice may show again next load.
  }
}

type BoardViewDemoNoticeProps = {
  open: boolean
  setupHref: string
  onDismiss: () => void
}

export const BoardViewDemoNotice = ({
  open,
  setupHref,
  onDismiss,
}: BoardViewDemoNoticeProps) => (
  <Dialog
    open={open}
    onOpenChange={(next) => {
      if (!next) onDismiss()
    }}
  >
    <DialogContent className="sm:max-w-md">
      <DialogHeader className="pr-6">
        <DialogTitle className="text-balance">
          This is a demo board for Oxford Circus
        </DialogTitle>
        <DialogDescription className="text-balance">
          Make your own by picking your stop in the Board builder.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDismiss}>
          Keep the demo
        </Button>
        <Button
          nativeButton={false}
          render={<Link href={setupHref} onClick={writeDemoNoticeDismissed} />}
        >
          Set up my board
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)
