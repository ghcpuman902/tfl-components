"use client"

import { useEffect, useRef } from "react"
import type { BusBoardRow } from "@/lib/tfl/homepage-live/actions"
import type {
  BoardEntry,
  BoardSection,
} from "@/lib/tfl/homepage-live/station-board"
import { getLineNameTiers } from "@/lib/tfl/line-names"
import { cn } from "@/lib/utils"

export const formatEta = (etaSec: number) =>
  etaSec < 30 ? "Due" : `${Math.max(1, Math.round(etaSec / 60))} min`

const sectionTitle = (section: BoardSection) =>
  section.lineIds.map((id) => getLineNameTiers(id).middle).join(" · ")

const SectionRule = ({ section }: { section: BoardSection }) =>
  section.lineIds.length > 1 ? (
    <div className="flex h-1" aria-hidden>
      {section.lineIds.map((id) => (
        <span key={id} data-line={id} className="flex-1 bg-(--line-color)" />
      ))}
    </div>
  ) : (
    <div data-line={section.lineIds[0]} className="h-1 bg-(--line-color)" aria-hidden />
  )

type RowProps = {
  entry: BoardEntry
  shared: boolean
  active: boolean
  selected: boolean
  onActive: (key: string | null) => void
  onSelect: (key: string) => void
  register: (key: string, element: HTMLElement | null) => void
}

const Row = ({ entry, shared, active, selected, onActive, onSelect, register }: RowProps) => {
  const linked = entry.link !== "none"
  const body = (
    <>
      {shared ? (
        <span data-line={entry.lineId} className="mr-2 h-5 w-1 shrink-0 rounded-full bg-(--line-color)" aria-hidden />
      ) : null}
      <span className="min-w-0 flex-1 truncate text-left text-lg">{entry.destination}</span>
      {entry.link === "beta" ? (
        <span className="mr-3 text-xs text-muted-foreground" title="Estimated from arrival times">
          Beta
        </span>
      ) : null}
      <span
        className={cn(
          "w-14 shrink-0 text-right text-lg tabular-nums",
          entry.etaSec < 30 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
        )}
      >
        {formatEta(entry.etaSec)}
      </span>
    </>
  )
  const cls = cn(
    "relative flex min-h-11 w-full items-center border-b border-border/60 px-1",
    (active || selected) &&
      "bg-sky-50 before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-(--line-color) before:content-[''] dark:bg-sky-950/40"
  )
  return (
    <li data-line={entry.lineId} ref={(el) => register(entry.key, el)}>
      {linked ? (
        <button
          type="button"
          className={cn(cls, "cursor-pointer")}
          aria-pressed={selected}
          aria-label={`${entry.destination}, ${formatEta(entry.etaSec)}. Show this train on the map.`}
          onMouseEnter={() => onActive(entry.key)}
          onMouseLeave={() => onActive(null)}
          onFocus={() => onActive(entry.key)}
          onBlur={() => onActive(null)}
          onClick={() => onSelect(entry.key)}
        >
          {body}
        </button>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  )
}

export type StationBoardViewProps = {
  title: string
  subtitle?: string
  sections: readonly BoardSection[]
  status: "loading" | "ok" | "error"
  error?: string
  activeKey: string | null
  selectedKey: string | null
  onActive: (key: string | null) => void
  onSelect: (key: string) => void
}

/** Skeleton rows keep the Board's height while the first poll is on its way. */
const BoardSkeleton = () => (
  <div className="space-y-6" aria-hidden>
    {[0, 1, 2].map((i) => (
      <div key={i} className="space-y-2">
        <div className="h-7 w-32 animate-pulse bg-muted" />
        <div className="h-1 bg-muted" />
        {[0, 1, 2].map((j) => (
          <div key={j} className="h-11 animate-pulse border-b border-border/60 bg-muted/40" />
        ))}
      </div>
    ))}
  </div>
)

export const StationBoardView = ({
  title,
  subtitle,
  sections,
  status,
  error,
  activeKey,
  selectedKey,
  onActive,
  onSelect,
}: StationBoardViewProps) => {
  const rows = useRef(new Map<string, HTMLElement>())
  const register = (key: string, element: HTMLElement | null) => {
    if (element) rows.current.set(key, element)
    else rows.current.delete(key)
  }
  useEffect(() => {
    if (selectedKey) rows.current.get(selectedKey)?.scrollIntoView({ block: "nearest" })
  }, [selectedKey])

  return (
    <section aria-label={`${title} arrivals`} className="min-w-0">
      <h2 className="text-3xl text-balance">{title}</h2>
      {subtitle ? <p className="text-base text-muted-foreground">{subtitle}</p> : null}
      {status === "error" && error ? (
        <p role="status" className="pt-3 text-sm text-balance text-muted-foreground">
          {error}
        </p>
      ) : null}
      <div className="pt-4">
        {status === "loading" ? (
          <BoardSkeleton />
        ) : sections.length === 0 ? (
          <p className="text-base text-balance text-muted-foreground">
            No trains are due here in the next 25 minutes.
          </p>
        ) : (
          sections.map((section) => (
            <div key={section.id} className="pb-6">
              <h3
                data-line={section.lineIds[0]}
                className="pb-1 text-2xl text-(--line-color)"
              >
                {sectionTitle(section)}
              </h3>
              <SectionRule section={section} />
              <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                {section.columns.map((column) => (
                  <div key={column.label}>
                    <h4 className="py-2 text-sm text-muted-foreground">{column.label}</h4>
                    <ul>
                      {column.entries.map((entry) => (
                        <Row
                          key={`${column.label}|${entry.key}`}
                          entry={entry}
                          shared={section.lineIds.length > 1}
                          active={activeKey === entry.key}
                          selected={selectedKey === entry.key}
                          onActive={onActive}
                          onSelect={onSelect}
                          register={register}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

export type BusBoardViewProps = {
  title: string
  stopLetter?: string
  towards?: string
  routes: readonly string[]
  rows: readonly BusBoardRow[]
  status: "loading" | "ok" | "error"
  error?: string
}

export const BusBoardView = ({
  title,
  stopLetter,
  towards,
  routes,
  rows,
  status,
  error,
}: BusBoardViewProps) => (
  <section aria-label={`${title} bus arrivals`} className="min-w-0">
    <div className="flex items-center gap-3">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#dc241f] text-xl leading-none text-white"
        aria-hidden
      >
        {stopLetter ?? "•"}
      </span>
      <h2 className="text-3xl text-balance">{title}</h2>
    </div>
    {towards ? <p className="pt-1 text-base text-muted-foreground">towards {towards}</p> : null}
    {routes.length ? (
      <p className="flex flex-wrap gap-x-3 pt-2 text-lg">
        {routes.map((route) => (
          <span key={route}>{route}</span>
        ))}
      </p>
    ) : null}
    <div className="h-1 mt-3 bg-[#dc241f]" aria-hidden />
    <div className="pt-2">
      {status === "loading" ? (
        <div className="space-y-px" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-11 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : status === "error" ? (
        <p role="status" className="text-sm text-balance text-muted-foreground">
          {error ?? "Bus arrivals are unavailable for this stop right now."}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-base text-balance text-muted-foreground">No buses are due at this stop.</p>
      ) : (
        <ul>
          {rows.slice(0, 10).map((row, index) => (
            <li
              key={`${row.route}-${row.vehicleId ?? index}`}
              className="flex min-h-11 items-center gap-3 border-b border-border/60 px-1"
            >
              <span className="w-12 shrink-0 text-xl">{row.route}</span>
              <span className="min-w-0 flex-1 truncate text-lg">{row.destination}</span>
              <span className="w-14 shrink-0 text-right text-lg tabular-nums">{formatEta(row.etaSec)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  </section>
)
