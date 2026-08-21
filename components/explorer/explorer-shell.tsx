"use client"

import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  PointsSvgArt,
  LinesKindArt,
} from "@/components/explorer/explorer-kind-cards"
import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel"
import {
  buildExplorerHref,
  domainLabel,
  domainsForKind,
  kindLabel,
  type ExplorerDomain,
  type ExplorerKind,
  type ExplorerState,
} from "@/lib/tfl/explorer-url-state"
import type { RoundelPreset } from "@/lib/tfl/roundel-presets"
import { cn } from "@/lib/utils"

type DomainTile = {
  value: ExplorerDomain
  label: string
  roundel: RoundelPreset
}

/** Sidebar order: Tube & rail, Bus, River, Cycle hire. */
const DOMAIN_TILES: readonly DomainTile[] = [
  {
    value: "tube-rail",
    label: domainLabel("tube-rail"),
    roundel: "underground",
  },
  { value: "bus", label: domainLabel("bus"), roundel: "buses" },
  { value: "river", label: domainLabel("river"), roundel: "river" },
  { value: "cycle", label: domainLabel("cycle"), roundel: "cycles" },
]

const domainTilesForKind = (kind: ExplorerKind): readonly DomainTile[] => {
  const available = new Set<string>(domainsForKind(kind))
  return DOMAIN_TILES.filter((tile) => available.has(tile.value))
}

const KIND_TRIGGER_CLASS =
  "group relative flex aspect-[4/5] w-full cursor-pointer flex-col overflow-hidden rounded-(--explorer-radius) border-0 bg-muted p-0 text-left opacity-55 saturate-50 shadow-none transition-[opacity,filter,box-shadow] duration-300 hover:opacity-80 hover:saturate-75 hover:shadow-lg data-active:bg-muted data-active:opacity-100 data-active:saturate-100 data-active:shadow-xl data-active:hover:opacity-100 data-active:hover:saturate-100 sm:aspect-video dark:data-active:bg-muted [&_svg]:size-full [&_svg]:max-w-none [&_svg]:shrink-0"

const DOMAIN_TILE_TRIGGER_CLASS =
  "relative z-0 h-auto min-h-0 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-t-(--explorer-radius) rounded-b-none border border-transparent bg-transparent px-1 py-2 text-center text-[11px] font-semibold whitespace-normal shadow-none after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-0.5 after:z-10 after:h-0.5 after:bg-transparent after:opacity-100 after:transition-none hover:border-border hover:border-b-transparent hover:bg-background/70 hover:text-foreground hover:after:bg-background/70 focus-visible:ring-2 focus-visible:ring-ring/50 group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:-bottom-0.5 group-data-horizontal/tabs:after:h-0.5 data-active:z-10 data-active:-mb-0.5 data-active:border-border data-active:border-b-transparent data-active:bg-background data-active:text-foreground data-active:shadow-none data-active:after:bg-background data-active:hover:border-border data-active:hover:border-b-transparent data-active:hover:bg-background data-active:hover:after:bg-background dark:data-active:bg-background dark:data-active:after:bg-background dark:data-active:shadow-none group-data-[variant=default]/tabs-list:data-active:shadow-none disabled:cursor-not-allowed disabled:hover:border-transparent disabled:hover:bg-transparent disabled:hover:after:bg-transparent sm:min-h-[4.5rem] sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:px-4 sm:py-4 sm:text-left sm:text-base"

const DomainTileLabel = ({
  roundel,
  label,
}: {
  roundel: RoundelPreset
  label: string
}) => (
  <>
    <TfLRoundel
      variant={roundel}
      text=""
      className="pointer-events-none size-7 shrink-0 sm:size-10"
      aria-hidden
    />
    <span className="min-w-0 leading-tight">{label}</span>
  </>
)

type ExplorerShellProps = {
  state: ExplorerState
  children?: ReactNode
}

/**
 * Kind → Domain chrome. Path state comes from the server layout so this
 * client tree does not call `usePathname()` during prerender.
 */
export const ExplorerShell = ({ state, children }: ExplorerShellProps) => {
  const router = useRouter()

  const navigate = (next: Partial<ExplorerState>) => {
    router.push(buildExplorerHref(next, state), { scroll: false })
  }

  const domainTiles = domainTilesForKind(state.kind)

  return (
    <div className="space-y-6">
      <div className="space-y-4 [--explorer-radius:calc(var(--radius)*1.8)]">
        <Tabs
          value={state.kind}
          onValueChange={(value) => {
            if (value === "points" || value === "lines") {
              navigate({
                kind: value,
                domain:
                  value === "lines" && state.domain === "cycle"
                    ? "tube-rail"
                    : domainsForKind(value).includes(state.domain)
                      ? state.domain
                      : "tube-rail",
                id: undefined,
                q: undefined,
                view: "list",
              })
            }
          }}
        >
          <TabsList
            aria-label="Explorer kind"
            className="grid h-auto w-full grid-cols-2 gap-3 bg-transparent p-0 group-data-horizontal/tabs:h-auto sm:gap-4"
          >
            <TabsTrigger value="points" className={KIND_TRIGGER_CLASS}>
              <div className="absolute inset-0 size-full overflow-hidden rounded-[inherit]">
                <PointsSvgArt />
              </div>
              <div className="absolute bottom-3 left-3 z-10 sm:bottom-4 sm:left-5">
                <span className="text-xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] sm:text-3xl">
                  {kindLabel("points")}
                </span>
              </div>
            </TabsTrigger>

            <TabsTrigger value="lines" className={KIND_TRIGGER_CLASS}>
              <div className="absolute inset-0 size-full overflow-hidden rounded-[inherit]">
                <LinesKindArt />
              </div>
              <div className="absolute bottom-3 left-3 z-10 sm:bottom-4 sm:left-5">
                <span className="text-xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] sm:text-3xl">
                  {kindLabel("lines")}
                </span>
              </div>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs
          value={state.domain}
          onValueChange={(value) => {
            const domain = value as ExplorerDomain
            if (domainsForKind(state.kind).includes(domain)) {
              navigate({
                domain,
                id: undefined,
                q: undefined,
                view: "list",
              })
            }
          }}
        >
          <TabsList
            aria-label="Explorer domain"
            className={cn(
              "grid h-auto w-full gap-0 rounded-(--explorer-radius) border-b border-border bg-muted p-0 shadow-none group-data-horizontal/tabs:h-auto",
              domainTiles.length >= 4 ? "grid-cols-4" : "grid-cols-3"
            )}
          >
            {domainTiles.map((tile) => (
              <TabsTrigger
                key={tile.value}
                value={tile.value}
                className={DOMAIN_TILE_TRIGGER_CLASS}
              >
                <DomainTileLabel roundel={tile.roundel} label={tile.label} />
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {children}
    </div>
  )
}
