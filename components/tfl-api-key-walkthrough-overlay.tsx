"use client"

import { TflApiKeyWalkthrough } from "@/components/board/tfl-api-key-walkthrough"
import { useUserTflCredentials } from "@/components/user-tfl-credentials-provider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"

export const TflApiKeyWalkthroughOverlay = () => {
  const { walkthroughOpen, setWalkthroughOpen } = useUserTflCredentials()
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Sheet open={walkthroughOpen} onOpenChange={setWalkthroughOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] gap-0 overflow-y-auto"
        >
          <SheetHeader className="text-center">
            <SheetTitle className="text-center">
              How to get a key — step by step
            </SheetTitle>
            <SheetDescription className="sr-only">
              Steps from sign up to copying a key.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-5 px-4 pb-6">
            <TflApiKeyWalkthrough />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={walkthroughOpen} onOpenChange={setWalkthroughOpen}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="text-center">
          <DialogTitle className="text-center">
            How to get a key — step by step
          </DialogTitle>
          <DialogDescription className="sr-only">
            Steps from sign up to copying a key.
          </DialogDescription>
        </DialogHeader>
        <TflApiKeyWalkthrough />
      </DialogContent>
    </Dialog>
  )
}
