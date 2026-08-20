"use client"

import { useState } from "react"
import { LineBadge } from "@/components/tfl/brand/line-badge"
import { Input } from "@/components/ui/input"
import {
  parseArrivalsLines,
  serializeArrivalsLines,
} from "@/lib/tfl/board-settings"
import { cn } from "@/lib/utils"

export type BoardLineChipPickerLine = {
  lineId: string
  lineName?: string
}

type BoardLineChipPickerProps = {
  /** Full candidate set in canonical order. */
  lines: readonly BoardLineChipPickerLine[]
  /** Current explicit order, or undefined/empty for every candidate. */
  selected: readonly string[] | undefined
  onChange: (next: readonly string[] | undefined) => void
  id?: string
}

const allCandidateIds = (
  lines: readonly BoardLineChipPickerLine[]
): string[] => lines.map((line) => line.lineId)

const isShowingAll = (
  selected: readonly string[] | undefined,
  candidateIds: readonly string[]
): boolean => {
  if (!selected?.length) return true
  if (selected.length !== candidateIds.length) return false
  const set = new Set(selected)
  return candidateIds.every((id) => set.has(id))
}

const includedSet = (
  selected: readonly string[] | undefined,
  candidateIds: readonly string[]
): Set<string> =>
  isShowingAll(selected, candidateIds)
    ? new Set(candidateIds)
    : new Set(selected)

export const BoardLineChipPicker = ({
  lines,
  selected,
  onChange,
  id,
}: BoardLineChipPickerProps) => {
  const [asText, setAsText] = useState(false)
  const [draft, setDraft] = useState("")
  const candidateIds = allCandidateIds(lines)
  const included = includedSet(selected, candidateIds)

  const handleToggle = (lineId: string) => {
    const nextIncluded = new Set(included)
    if (nextIncluded.has(lineId)) {
      if (nextIncluded.size <= 1) return
      nextIncluded.delete(lineId)
    } else {
      nextIncluded.add(lineId)
    }
    const next = candidateIds.filter((id) => nextIncluded.has(id))
    onChange(isShowingAll(next, candidateIds) ? undefined : next)
  }

  const handleEditAsText = () => {
    setDraft(serializeArrivalsLines(selected) ?? "")
    setAsText(true)
  }

  const handleUseChips = () => {
    onChange(parseArrivalsLines(draft || null))
    setAsText(false)
  }

  if (asText) {
    return (
      <div className="space-y-2">
        <Input
          id={id}
          value={draft}
          onChange={(event) => {
            const next = event.target.value.toLowerCase().replace(/[^a-z0-9,-]/g, "")
            setDraft(next)
            onChange(parseArrivalsLines(next || null))
          }}
          autoComplete="off"
          spellCheck={false}
          placeholder={candidateIds.join(",")}
        />
        <button
          type="button"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          onClick={handleUseChips}
        >
          Use chips
        </button>
      </div>
    )
  }

  if (candidateIds.length === 0) return null

  return (
    <div className="space-y-2">
      <div id={id} className="flex flex-wrap gap-1.5" role="group">
        {lines.map((line) => {
          const on = included.has(line.lineId)
          return (
            <button
              key={line.lineId}
              type="button"
              aria-pressed={on}
              aria-label={`${line.lineName ?? line.lineId}${on ? "" : ", hidden"}`}
              onClick={() => handleToggle(line.lineId)}
              className={cn(
                "rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                !on && "opacity-40 grayscale"
              )}
            >
              <LineBadge
                lineId={line.lineId}
                name={line.lineName}
                className="pointer-events-none"
              />
            </button>
          )
        })}
      </div>
      <button
        type="button"
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        onClick={handleEditAsText}
      >
        Edit as text
      </button>
    </div>
  )
}
