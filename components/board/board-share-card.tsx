"use client"

import { useMemo, useState } from "react"
import { CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react"
import { encode } from "uqr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { type BoardKeyMode } from "@/lib/tfl/board-share"

const COPIED_MS = 2000

type BoardShareCardProps = {
  url: string
  href: string
  keyMode: BoardKeyMode
  onKeyModeChange: (checked: boolean) => void
  hasKey: boolean
  appKeyMasked: string | null
  persistMode: "local" | "session" | undefined
  onManageKey: () => void
}

export const BoardShareCard = ({
  url,
  href,
  keyMode,
  onKeyModeChange,
  hasKey,
  appKeyMasked,
  persistMode,
  onManageKey,
}: BoardShareCardProps) => {
  const [copied, setCopied] = useState(false)
  const matrix = useMemo(
    () => (url ? encode(url, { ecc: "M", border: 2 }) : null),
    [url]
  )
  const size = matrix?.size ?? 0
  const cells = matrix?.data ?? []

  const handleCopy = () => {
    if (!url) return
    void navigator.clipboard.writeText(url).then(
      () => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), COPIED_MS)
      },
      () => undefined
    )
  }

  return (
    <section className="space-y-3" aria-label="Share">
      <div className="flex items-center gap-2">
        <Input
          readOnly
          value={url}
          aria-label="Board URL"
          className="min-w-0 flex-1 font-mono text-xs"
          onFocus={(event) => event.currentTarget.select()}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleCopy}
          aria-label={copied ? "Copied board URL" : "Copy board URL"}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </Button>
        <Button
          nativeButton={false}
          variant="outline"
          size="icon"
          aria-label="Open full display"
          render={<a href={href} target="_blank" rel="noreferrer" />}
        >
          <ExternalLinkIcon />
        </Button>
        {matrix ? (
          <div className="shrink-0 rounded-md bg-white p-1">
            <svg
              role="img"
              aria-label={`QR code for ${url}`}
              viewBox={`0 0 ${size} ${size}`}
              className="size-16 text-black"
              shapeRendering="crispEdges"
            >
              <rect width={size} height={size} fill="white" />
              {cells.map((row, y) =>
                row.map((on, x) =>
                  on ? (
                    <rect
                      key={`${x}-${y}`}
                      x={x}
                      y={y}
                      width={1}
                      height={1}
                      fill="currentColor"
                    />
                  ) : null
                )
              )}
            </svg>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Switch
          id="board-save-key"
          checked={keyMode === "browser"}
          onCheckedChange={onKeyModeChange}
          aria-describedby="board-save-key-hint"
        />
        <label htmlFor="board-save-key" className="text-sm text-foreground">
          Save key on this browser
        </label>
        {hasKey && appKeyMasked ? (
          <button
            type="button"
            className="font-mono text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={onManageKey}
            aria-label={`Manage TfL API key ending ${appKeyMasked.slice(-4)}`}
          >
            {appKeyMasked}
          </button>
        ) : (
          <button
            type="button"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={onManageKey}
          >
            Add TfL API key
          </button>
        )}
        {persistMode === "session" ? (
          <span className="text-sm text-muted-foreground">This tab only</span>
        ) : null}
      </div>
      <p id="board-save-key-hint" className="text-sm text-muted-foreground">
        {keyMode === "browser"
          ? "URL omits the key — works in this browser only."
          : "Anyone with the complete link can use the key and its quota."}
      </p>
    </section>
  )
}
