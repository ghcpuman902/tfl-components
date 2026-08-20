"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { SearchIcon } from "lucide-react"
import {
  DOCS_ENTRIES,
  DOCS_GROUPS,
  isInternalDocsEntry,
  type DocsEntry,
} from "@/lib/docs-catalog"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Kbd, KbdGroup } from "@/components/ui/kbd"

const isMacUserAgent = (userAgent: string) =>
  /Mac|iPhone|iPod|iPad/.test(userAgent)

const isVisibleElement = (element: HTMLElement) =>
  typeof element.checkVisibility === "function"
    ? element.checkVisibility()
    : element.getClientRects().length > 0

type DocsSearchProps = {
  variant?: "sidebar" | "mobile" | "header"
  className?: string
  /** Called after a result is chosen, before navigation. */
  onNavigate?: () => void
}

const groupTitle = (entry: DocsEntry): string =>
  DOCS_GROUPS.find((group) => group.id === entry.group)?.title ?? entry.group

const matchesQuery = (entry: DocsEntry, query: string): boolean => {
  const q = query.trim().toLowerCase()
  if (!q) return false
  const haystack = [
    entry.title,
    entry.description,
    entry.slug,
    entry.registryName ?? "",
    groupTitle(entry),
    entry.layer ?? "",
    entry.kind,
  ]
    .join(" ")
    .toLowerCase()
  return q.split(/\s+/).every((token) => haystack.includes(token))
}

/**
 * Local catalogue search over DOCS_ENTRIES — keyboard accessible.
 * Arrow keys move selection; Enter opens; Escape clears / blurs.
 */
export const DocsSearch = ({
  variant = "sidebar",
  className,
  onNavigate,
}: DocsSearchProps) => {
  const router = useRouter()
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const [isMac, setIsMac] = useState(true)
  const showShortcutHint = variant === "header"

  const results = useMemo(() => {
    if (!query.trim()) return [] as DocsEntry[]
    return DOCS_ENTRIES.filter((entry) => {
      if (entry.comingSoon) return false
      if (
        process.env.NODE_ENV !== "development" &&
        isInternalDocsEntry(entry)
      ) {
        return false
      }
      return matchesQuery(entry, query)
    }).slice(0, 12)
  }, [query])

  const handleQueryChange = (value: string) => {
    setQuery(value)
    setActiveIndex(0)
    setOpen(true)
  }

  const handleOpen = useCallback(
    (entry: DocsEntry) => {
      setQuery("")
      setActiveIndex(0)
      setOpen(false)
      onNavigate?.()
      router.push(entry.href)
    },
    [onNavigate, router]
  )

  useEffect(() => {
    setIsMac(isMacUserAgent(navigator.userAgent))
  }, [])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (event.key.toLowerCase() !== "k") return
      if (!event.metaKey && !event.ctrlKey) return
      if (event.altKey || event.shiftKey) return

      const input = inputRef.current
      if (!input || !isVisibleElement(input)) return

      event.preventDefault()
      input.focus()
      input.select()
    }

    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      if (results.length > 0) setOpen(true)
    }

    if (event.key === "ArrowDown") {
      event.preventDefault()
      if (results.length === 0) return
      setOpen(true)
      setActiveIndex((index) => (index + 1) % results.length)
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      if (results.length === 0) return
      setOpen(true)
      setActiveIndex((index) => (index - 1 + results.length) % results.length)
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      const target = results[activeIndex]
      if (target) handleOpen(target)
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      if (query) {
        setQuery("")
        setOpen(false)
        return
      }
      inputRef.current?.blur()
    }
  }

  return (
    <div
      className={cn(
        "relative w-full",
        variant === "header" && "@container min-w-0",
        className
      )}
    >
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search documentation
      </label>
      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          ref={inputRef}
          id={`${listId}-input`}
          type="search"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && results[activeIndex]
              ? `${listId}-option-${activeIndex}`
              : undefined
          }
          placeholder={variant === "sidebar" ? "Search catalogue…" : "Search"}
          value={query}
          onChange={(event) => {
            handleQueryChange(event.target.value)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Delay so option mousedown / click can fire first.
            window.setTimeout(() => setOpen(false), 120)
          }}
          onKeyDown={handleKeyDown}
          aria-keyshortcuts="Meta+K Control+K"
          className={cn(
            "h-8 min-w-0 bg-background pr-2 pl-8 text-sm",
            showShortcutHint && "pr-14"
          )}
          autoComplete="off"
        />
        {showShortcutHint && !query ? (
          <KbdGroup
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-1.5 z-10 -translate-y-1/2"
          >
            <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
        ) : null}
      </div>

      {open && query.trim() ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Search results"
          className={cn(
            "z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md",
            variant === "mobile" ? "relative" : "absolute"
          )}
        >
          {results.length === 0 ? (
            <li className="px-2 py-3 text-center text-sm text-muted-foreground">
              No matches
            </li>
          ) : (
            results.map((entry, index) => {
              const selected = index === activeIndex
              return (
                <li
                  key={entry.slug}
                  id={`${listId}-option-${index}`}
                  role="option"
                  aria-selected={selected}
                >
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left text-sm outline-none",
                      selected
                        ? "bg-muted text-foreground"
                        : "hover:bg-muted/60"
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => handleOpen(entry)}
                  >
                    <span className="font-medium">{entry.title}</span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {entry.description}
                    </span>
                    <span className="text-[11px] text-muted-foreground/80">
                      {groupTitle(entry)}
                      {entry.layer ? ` · ${entry.layer}` : ""} · {entry.href}
                    </span>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      ) : null}
    </div>
  )
}
