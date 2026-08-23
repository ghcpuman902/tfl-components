"use client"

import { useState } from "react"
import Link from "next/link"
import { ARRIVALS_RHYTHM_VARS } from "@/components/tfl/arrivals/arrivals-board-view"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useIsMobile } from "@/hooks/use-mobile"
import { parseBoardViewLink } from "@/lib/tfl/board-view-resolve"
import { BOARD_PATH, type BoardConfig } from "@/lib/tfl/board-url-state"

type BoardViewRecoveryProps = {
  onLoad: (config: BoardConfig, key: string) => void
}

const RECOVERY_OVERLAY_CLASS =
  "bg-background/45 backdrop-blur-md supports-backdrop-filter:bg-background/30"

const RecoveryBackdrop = () => (
  <div
    aria-hidden
    className="pointer-events-none mx-auto max-w-3xl select-none"
    style={ARRIVALS_RHYTHM_VARS}
  >
    <div className="mb-4 h-7 w-52 rounded-md bg-muted/80" />
    <div className="divide-y divide-border/70">
      {Array.from({ length: 10 }, (_, index) => (
        <div
          key={index}
          className="flex items-center justify-between"
          style={{ height: "var(--arrivals-row)" }}
        >
          <div className="h-3 w-[42%] rounded bg-muted/80" />
          <div className="h-3 w-10 rounded bg-muted/80" />
        </div>
      ))}
    </div>
  </div>
)

const RecoveryFields = ({
  value,
  error,
  onChange,
  className,
}: {
  value: string
  error: string | null
  onChange: (value: string) => void
  className?: string
}) => (
  <div className={className ?? "space-y-2"}>
    <Label htmlFor="board-recovery-link">Board link</Label>
    <Textarea
      id="board-recovery-link"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      autoComplete="off"
      spellCheck={false}
      rows={4}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? "board-recovery-error" : undefined}
      className="min-h-24 font-mono text-xs"
    />
    {error ? (
      <p
        id="board-recovery-error"
        className="text-sm text-destructive"
        role="alert"
      >
        {error}
      </p>
    ) : null}
  </div>
)

const RecoveryActions = ({
  onLoad,
}: {
  onLoad: () => void
}) => (
  <>
    <Button type="button" className="w-full" onClick={onLoad}>
      Load board
    </Button>
    <Button
      nativeButton={false}
      variant="outline"
      className="w-full"
      render={<Link href={BOARD_PATH} />}
    >
      Set up a new board
    </Button>
  </>
)

export const BoardViewRecovery = ({ onLoad }: BoardViewRecoveryProps) => {
  const isMobile = useIsMobile()
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleLoad = () => {
    const result = parseBoardViewLink(draft)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    onLoad(result.config, result.key)
    setDraft("")
  }

  const handleDraftChange = (value: string) => {
    setDraft(value)
    setError(null)
  }

  return (
    <>
      <RecoveryBackdrop />
      {isMobile ? (
        <Sheet open onOpenChange={() => undefined} disablePointerDismissal>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            overlayClassName={RECOVERY_OVERLAY_CLASS}
            className="gap-0 pb-[max(1rem,env(safe-area-inset-bottom))]"
            onKeyDown={(event) => {
              if (event.key === "Escape") event.preventDefault()
            }}
          >
            <SheetHeader>
              <SheetTitle>Open your board</SheetTitle>
              <SheetDescription>
                Paste the complete Board link from the device where you set it
                up. The link contains the layout and TfL API key.
              </SheetDescription>
            </SheetHeader>
            <RecoveryFields
              value={draft}
              error={error}
              onChange={handleDraftChange}
              className="space-y-2 px-4"
            />
            <SheetFooter>
              <RecoveryActions onLoad={handleLoad} />
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open onOpenChange={() => undefined} disablePointerDismissal>
          <DialogContent
            showCloseButton={false}
            overlayClassName={RECOVERY_OVERLAY_CLASS}
            className="max-w-lg overflow-hidden sm:max-w-lg"
            onKeyDown={(event) => {
              if (event.key === "Escape") event.preventDefault()
            }}
          >
            <DialogHeader>
              <DialogTitle>Open your board</DialogTitle>
              <DialogDescription>
                Paste the complete Board link from the device where you set it
                up. The link contains the layout and TfL API key.
              </DialogDescription>
            </DialogHeader>
            <RecoveryFields
              value={draft}
              error={error}
              onChange={handleDraftChange}
            />
            <DialogFooter className="sm:flex-col sm:items-stretch">
              <RecoveryActions onLoad={handleLoad} />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
