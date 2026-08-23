"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"

type BoardViewHomeScreenOfferProps = {
  open: boolean
  onDismiss: () => void
}

export const BoardViewHomeScreenOffer = ({
  open,
  onDismiss,
}: BoardViewHomeScreenOfferProps) => {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(next) => { if (!next) onDismiss() }}>
        <SheetContent side="bottom" showCloseButton={false}>
          <SheetHeader>
            <SheetTitle>Use this board full screen</SheetTitle>
            <SheetDescription>
              Add it to your Home Screen to hide Safari controls.
            </SheetDescription>
          </SheetHeader>
          <p className="px-4 text-sm text-foreground">
            Tap Share, then Add to Home Screen.
          </p>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={onDismiss}>
              Not now
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onDismiss() }}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Use this board full screen</DialogTitle>
          <DialogDescription>
            Add it to your Home Screen to hide Safari controls.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-foreground">
          Tap Share, then Add to Home Screen.
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDismiss}>
            Not now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
