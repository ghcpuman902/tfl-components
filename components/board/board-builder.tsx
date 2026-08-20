"use client"

import { useMemo, useState, useSyncExternalStore } from "react"
import { ChevronDownIcon } from "lucide-react"
import { BoardConfigForm } from "@/components/board/board-config-form"
import { BoardUrlLegend } from "@/components/board/board-url-legend"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useUserTflCredentials } from "@/components/user-tfl-credentials-provider"
import { useHorizontalScrollEnd } from "@/hooks/use-horizontal-scroll-end"
import {
  lookupBoardStationLineGroups,
  lookupBoardStationLines,
  type BoardStationLinesIndex,
} from "@/lib/tfl/board-station-lines"
import {
  lookupBoardStationName,
  resolveBoardStopNameOverride,
  type BoardStationNamesIndex,
  type BoardStationSearchItem,
} from "@/lib/tfl/board-station-names"
import { getBoardNearbyPlaces } from "@/lib/tfl/board-nearby-action"
import { boardSlotsInclude, resolveBoardSlots } from "@/lib/tfl/board-panels"
import {
  applyBoardRecipe,
  BOARD_PRESETS,
  DEFAULT_BOARD_PRESET_ID,
  getBoardPreset,
  type BoardPresetDef,
  type BoardPresetId,
} from "@/lib/tfl/board-presets"
import type { BoardSettingId } from "@/lib/tfl/board-settings"
import { BoardQrDialog } from "@/components/board/board-qr-dialog"
import { Switch } from "@/components/ui/switch"
import {
  BOARD_KEY_MODE_LABEL,
  boardConfigForShare,
  boardKeyModeFromPersist,
  buildShareableBoardHref,
  buildShareableBoardUrl,
  type BoardKeyMode,
} from "@/lib/tfl/board-share"
import {
  BOARD_VIEW_PATH,
  describeBoardHrefSegments,
  DEFAULT_BOARD_CONFIG,
  type BoardConfig,
} from "@/lib/tfl/board-url-state"
import { HOME_RAIL_STOP } from "@/lib/tfl/home-arrivals-stops"
import { cn } from "@/lib/utils"

const subscribeToOrigin = () => () => undefined
const getBrowserOrigin = () => window.location.origin
const getServerOrigin = () => ""

const PreviewRows = ({ count }: { count: number }) => (
  <div className="grid min-h-0 flex-1 gap-1">
    {Array.from({ length: count }, (_, index) => (
      <span
        key={index}
        className="block rounded-sm bg-background/70"
        style={{ width: `${94 - index * 9}%` }}
      />
    ))}
  </div>
)

const PresetDiagram = ({ preset }: { preset: BoardPresetId }) => {
  if (preset === "station") {
    return (
      <div className="grid h-24 grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] gap-1.5 rounded-lg bg-foreground p-2">
        <div className="flex min-w-0 flex-col gap-1.5 rounded bg-background/15 p-1.5">
          <span className="h-2.5 w-2/3 rounded-sm bg-background" />
          <PreviewRows count={4} />
        </div>
        <div className="grid min-w-0 grid-rows-[auto_1fr] gap-1.5">
          <span className="rounded bg-background px-1.5 py-1 text-center text-[0.55rem] leading-none text-foreground">
            12:42
          </span>
          <div className="grid gap-1 rounded bg-background/15 p-1.5">
            <span className="rounded-sm bg-background/80" />
            <span className="rounded-sm bg-background/55" />
            <span className="rounded-sm bg-background/70" />
            <span className="rounded-sm bg-background/45" />
          </div>
        </div>
      </div>
    )
  }

  if (preset === "near") {
    return (
      <div className="grid h-24 grid-cols-3 grid-rows-2 gap-1.5 rounded-lg bg-foreground p-2">
        <div className="col-span-2 flex flex-col gap-1 rounded bg-background/20 p-1.5">
          <span className="h-2 w-1/2 rounded-sm bg-background/80" />
          <PreviewRows count={2} />
        </div>
        <div className="rounded bg-background/50" />
        <div className="rounded bg-background/35" />
        <div className="col-span-2 grid grid-cols-3 gap-1 rounded bg-background/15 p-1.5">
          <span className="rounded-sm bg-background/75" />
          <span className="rounded-sm bg-background/50" />
          <span className="rounded-sm bg-background/65" />
        </div>
      </div>
    )
  }

  if (preset === "arrivals") {
    return (
      <div className="flex h-24 flex-col gap-1.5 rounded-lg bg-foreground p-2.5">
        <span className="mb-0.5 h-2.5 w-2/5 rounded-sm bg-background" />
        <PreviewRows count={4} />
      </div>
    )
  }

  return (
    <div className="flex h-24 flex-col gap-1.5 rounded-lg bg-foreground p-2.5">
      <span className="mb-0.5 h-2.5 w-2/5 rounded-sm bg-background" />
      <span className="h-3 rounded-sm bg-background/80" />
      <span className="h-3 w-11/12 rounded-sm bg-background/55" />
      <span className="h-3 w-4/5 rounded-sm bg-background/70" />
      <span className="h-3 w-2/3 rounded-sm bg-background/40" />
    </div>
  )
}

const PRESET_FEEDBACK_MOTION = "duration-300 ease-[cubic-bezier(0.05,0,0,1)]"
const PRESET_COLOR_MOTION = "duration-200 ease-[cubic-bezier(0.05,0,0,1)]"

const PresetCardFeedback = () => (
  <>
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-0 rounded-2xl bg-foreground/13 opacity-0 transition-opacity",
        PRESET_FEEDBACK_MOTION,
        "group-focus-within/preset:opacity-100 group-hover/preset:opacity-100"
      )}
    />
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-0 rounded-2xl bg-foreground/10 opacity-0 transition-opacity",
        PRESET_FEEDBACK_MOTION,
        "group-active/preset:opacity-100"
      )}
    />
  </>
)

const PresetCard = ({
  preset,
  active,
  onSelect,
}: {
  preset: BoardPresetDef
  active: boolean
  onSelect: () => void
}) => (
  <li
    className="group/preset relative isolate z-0 shrink-0 snap-start px-1.5 py-3 first:pl-3 last:pr-3 focus-within:z-10 hover:z-10"
    aria-current={active ? "true" : undefined}
  >
    <PresetCardFeedback />
    <Card
      className={cn(
        "relative z-10 h-full w-[82vw] max-w-84 gap-3 py-3 sm:w-80",
        active ? "ring-2 ring-primary" : "bg-muted/30 text-muted-foreground"
      )}
    >
      <button
        type="button"
        className="absolute inset-0 z-20 rounded-xl"
        onClick={onSelect}
        aria-label={`Use ${preset.title} layout`}
      />
      <CardContent className="px-3">
        <PresetDiagram preset={preset.id} />
      </CardContent>
      <CardHeader className="px-3">
        <CardTitle className="text-base text-foreground">
          {preset.title}
        </CardTitle>
        <CardDescription
          className={cn(
            "transition-colors",
            PRESET_COLOR_MOTION,
            "group-focus-within/preset:text-foreground group-hover/preset:text-foreground"
          )}
        >
          {preset.description}
        </CardDescription>
        <CardAction>
          <Badge variant={preset.available ? "default" : "secondary"}>
            {preset.available
              ? active
                ? "Current"
                : "Available"
              : "Not yet available"}
          </Badge>
        </CardAction>
      </CardHeader>
    </Card>
  </li>
)

const initialBoardConfig = (): BoardConfig => ({
  ...DEFAULT_BOARD_CONFIG,
  stop: HOME_RAIL_STOP.id,
  arrivals: {},
})

type BoardBuilderProps = {
  stationLines: BoardStationLinesIndex
  stationNames: BoardStationNamesIndex
  stations: readonly BoardStationSearchItem[]
}

export const BoardBuilder = ({
  stationLines,
  stationNames,
  stations,
}: BoardBuilderProps) => {
  const {
    status,
    hydrated,
    appKeyMasked,
    persistMode,
    error,
    getAppKey,
    openDialog,
    save,
  } = useUserTflCredentials()
  const { scrollRef, showEndFade } = useHorizontalScrollEnd<HTMLUListElement>()

  const [presetId, setPresetId] = useState<BoardPresetId>(
    DEFAULT_BOARD_PRESET_ID
  )
  const [config, setConfig] = useState<BoardConfig>(initialBoardConfig)
  const [configOpen, setConfigOpen] = useState(false)
  const [locateBusy, setLocateBusy] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)
  const [keyModeOverride, setKeyModeOverride] = useState<BoardKeyMode | null>(
    null,
  )
  const [qrOpen, setQrOpen] = useState(false)
  const origin = useSyncExternalStore(
    subscribeToOrigin,
    getBrowserOrigin,
    getServerOrigin
  )

  const availablePresets = BOARD_PRESETS.filter((item) => item.available)

  const preset = getBoardPreset(presetId)
  const resolvedSlots = resolveBoardSlots(config.slots.p1, config.slots.p2)
  const formSettings = useMemo(() => {
    const ids = new Set<BoardSettingId>(preset.formSettings)
    if (boardSlotsInclude(resolvedSlots, "rail")) {
      ids.add("stop")
      ids.add("stopName")
      ids.add("arrivalsLines")
      ids.add("arrivalsRows")
      ids.add("arrivalsPinFirst")
    }
    if (boardSlotsInclude(resolvedSlots, "bus")) {
      ids.add("busStop")
      ids.add("busRoutes")
      ids.add("busRows")
    }
    if (boardSlotsInclude(resolvedSlots, "river")) {
      ids.add("riverStop")
      ids.add("riverRows")
    }
    if (boardSlotsInclude(resolvedSlots, "cycle")) {
      ids.add("cycleDocks")
      ids.add("cycleTiles")
    }
    if (boardSlotsInclude(resolvedSlots, "status")) {
      ids.add("statusSurface")
      ids.add("statusTiles")
      ids.add("statusLines")
      ids.add("statusOverview")
    }
    return [...ids]
  }, [preset.formSettings, resolvedSlots])
  const appKey = hydrated ? (getAppKey() ?? "") : ""
  const hasKey = Boolean(appKey)

  const autoStopName = lookupBoardStationName(stationNames, config.stop)

  const forUrl = useMemo(
    () => ({
      ...config,
      stop: config.stop?.trim() || undefined,
      stopName: resolveBoardStopNameOverride(config.stopName, autoStopName),
      key: appKey.trim() || undefined,
    }),
    [config, appKey, autoStopName]
  )

  const inferredKeyMode = boardKeyModeFromPersist(
    hydrated ? persistMode : undefined,
    hasKey,
  )
  const keyMode = keyModeOverride ?? inferredKeyMode

  const shareConfig = useMemo(
    () => boardConfigForShare(forUrl, keyMode),
    [forUrl, keyMode]
  )

  const href = useMemo(
    () => buildShareableBoardHref(forUrl, keyMode),
    [forUrl, keyMode]
  )

  const segments = useMemo(
    () => describeBoardHrefSegments(shareConfig),
    [shareConfig]
  )

  const absoluteUrl = buildShareableBoardUrl(origin, forUrl, keyMode)
  const legendPath = origin ? `${origin}${BOARD_VIEW_PATH}` : BOARD_VIEW_PATH

  const handleKeyModeChange = (checked: boolean) => {
    const nextMode: BoardKeyMode = checked ? "browser" : "portable"
    setKeyModeOverride(nextMode)
    if (nextMode === "browser" && appKey.trim()) {
      void save(appKey, "local")
    }
  }

  const handleConfigChange = (next: Partial<BoardConfig>) => {
    setConfig((current) => {
      const stopChanged =
        next.stop !== undefined && next.stop.trim() !== (current.stop ?? "")

      const merged: BoardConfig = {
        ...current,
        ...next,
        slots: {
          ...current.slots,
          ...next.slots,
        },
        arrivals: {
          ...current.arrivals,
          ...next.arrivals,
        },
        bus: {
          ...current.bus,
          ...next.bus,
        },
        river: {
          ...current.river,
          ...next.river,
        },
        cycle: {
          ...current.cycle,
          ...next.cycle,
        },
        status: {
          ...current.status,
          ...next.status,
        },
      }

      // Positional overrides are stop-relative — drop them on stop change.
      // A scalar `a.rows` survives. Stop name is an override only — leave
      // it empty so the board resolves the heading from the Stop ID.
      if (stopChanged) {
        const rows = merged.arrivals.rows
        merged.arrivals = {
          rows: typeof rows === "number" ? rows : undefined,
          lineOrder: undefined,
        }

        const prevAutoName = lookupBoardStationName(stationNames, current.stop)
        const wasOverride =
          Boolean(current.stopName?.trim()) &&
          current.stopName?.trim() !== prevAutoName
        if (!wasOverride && next.stopName === undefined) {
          merged.stopName = undefined
        }
      }

      return merged
    })
  }

  const handleManageKey = () => {
    openDialog()
  }

  const handleSelectRecipe = (id: BoardPresetId) => {
    const nextPreset = getBoardPreset(id)
    setPresetId(id)
    setConfig((current) => applyBoardRecipe(current, nextPreset))
    setConfigOpen(true)
  }

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocateError("This browser cannot share a location.")
      return
    }
    setLocateBusy(true)
    setLocateError(null)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const result = await getBoardNearbyPlaces(
            position.coords.latitude,
            position.coords.longitude
          )
          if (!result.ok) {
            setLocateError(result.error)
            return
          }
          const near = getBoardPreset("near")
          setPresetId("near")
          setConfig((current) => {
            const next = applyBoardRecipe(current, near)
            const p1 = [...near.slots.p1]
            if (result.river && !p1.includes("river")) p1.push("river")
            return {
              ...next,
              stop: result.rail?.id ?? next.stop,
              stopName: undefined,
              slots: { p1, p2: [...near.slots.p2] },
              bus: { ...next.bus, stop: result.bus?.id },
              river: { ...next.river, stop: result.river?.id },
              cycle: { ...next.cycle, docks: result.docks },
            }
          })
          setConfigOpen(true)
        } catch (err) {
          setLocateError(
            err instanceof Error ? err.message : "Could not find nearby stops."
          )
        } finally {
          setLocateBusy(false)
        }
      },
      (error) => {
        setLocateBusy(false)
        setLocateError(
          error.message || "Location permission is needed to find nearby stops."
        )
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 30_000 }
    )
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3" aria-labelledby="board-layouts-heading">
        <h2 id="board-layouts-heading" className="text-lg font-semibold">
          Layout
        </h2>
        <div className="relative">
          <ul
            ref={scrollRef}
            className="flex snap-x snap-mandatory scrollbar-none overflow-x-auto overscroll-x-contain"
            aria-label="Board layouts"
            tabIndex={0}
          >
            {availablePresets.map((item) => (
              <PresetCard
                key={item.id}
                preset={item}
                active={item.id === presetId}
                onSelect={() => handleSelectRecipe(item.id)}
              />
            ))}
          </ul>
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 w-14 bg-linear-to-l from-background via-background/90 to-transparent transition-opacity duration-150 ease-[ease]",
              showEndFade ? "opacity-100" : "opacity-0"
            )}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 px-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleLocate}
            disabled={locateBusy}
          >
            {locateBusy ? "Finding nearby stops…" : "Locate near me"}
          </Button>
          {locateError ? (
            <p className="text-sm text-destructive" role="alert">
              {locateError}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Pins the nearest rail, bus, and cycle docks into the URL. Does not
              run on the live display.
            </p>
          )}
        </div>
      </section>

      <Collapsible
        open={configOpen}
        onOpenChange={setConfigOpen}
        className="rounded-xl border border-border"
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <span>
            <span className="block text-lg font-semibold text-foreground">
              Config
            </span>
            <span className="block text-sm text-muted-foreground">
              Station and display settings
            </span>
          </span>
          <ChevronDownIcon
            className={cn(
              "size-4 shrink-0 transition-transform duration-150 ease-[ease]",
              configOpen && "rotate-180"
            )}
            aria-hidden
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border">
          <BoardConfigForm
            config={config}
            formSettings={formSettings}
            servingLines={lookupBoardStationLines(stationLines, config.stop)}
            lineGroups={lookupBoardStationLineGroups(config.stop)}
            autoStopName={autoStopName}
            stations={stations}
            segments={segments}
            onChange={handleConfigChange}
          />
        </CollapsibleContent>
      </Collapsible>

      <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <BoardUrlLegend
            path={legendPath}
            segments={segments}
            className="min-w-0 flex-1"
          />
          <div className="flex shrink-0 flex-col gap-2 sm:w-40">
            <Button
              type="button"
              variant="outline"
              data-copy-text={absoluteUrl}
              aria-label="Copy board URL"
            >
              Copy URL
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setQrOpen(true)}
            >
              Show QR code
            </Button>
            <Button
              nativeButton={false}
              render={<a href={href} target="_blank" rel="noreferrer" />}
            >
              Open full display
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {BOARD_KEY_MODE_LABEL[keyMode]}
          {keyMode === "browser"
            ? ". Another device will need its own key."
            : ". Anyone with the complete link can use the key and its quota."}
        </p>
      </div>
      <BoardQrDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        url={absoluteUrl}
        mode={keyMode}
      />

      <section className="space-y-3" aria-labelledby="board-preview-heading">
        <h2 id="board-preview-heading" className="text-lg font-semibold">
          Preview
        </h2>
        <p className="text-sm text-muted-foreground md:hidden">
          On a phone this preview is a crop. Open the full display to use it.
        </p>
        {hydrated ? (
          <iframe
            key={href}
            title="Board preview"
            src={href}
            className="h-[min(36rem,68svh)] w-full rounded-lg border border-border bg-background"
          />
        ) : (
          <div
            className="h-[min(36rem,68svh)] w-full rounded-lg border border-border bg-muted"
            aria-busy="true"
            aria-label="Loading board preview"
          />
        )}
        <Button
          nativeButton={false}
          className="md:hidden"
          render={<a href={href} target="_blank" rel="noreferrer" />}
        >
          Open full display
        </Button>
      </section>

      <section
        className="space-y-3 rounded-xl border border-border p-4"
        aria-labelledby="board-key-heading"
      >
        <div className="space-y-1">
          <h2 id="board-key-heading" className="text-lg font-semibold">
            TfL API key
          </h2>
          <p id="board-key-copy" className="text-sm text-muted-foreground">
            Board loads live TfL data in this browser. The key is not sent to
            this site&apos;s server, logs, or referrers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Switch
            id="board-save-key"
            checked={keyMode === "browser"}
            onCheckedChange={handleKeyModeChange}
            aria-describedby="board-save-key-hint"
          />
          <label htmlFor="board-save-key" className="text-sm text-foreground">
            Save key on this browser
          </label>
        </div>
        <p id="board-save-key-hint" className="text-sm text-muted-foreground">
          {keyMode === "browser"
            ? "The generated URL and QR code omit the key. Open the Board in this browser to use the stored key."
            : "The generated URL and QR code include the key in the hash so you can set up another device without typing it there."}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {!hydrated ? (
            <span className="text-sm text-muted-foreground">
              Checking for a saved key…
            </span>
          ) : hasKey && appKeyMasked ? (
            <>
              <span className="text-sm">Active key</span>
              <Button
                type="button"
                variant="outline"
                className="font-mono"
                onClick={handleManageKey}
                aria-label={`Manage TfL API key ending ${appKeyMasked.slice(-4)}`}
                aria-describedby="board-key-copy"
              >
                {appKeyMasked}
              </Button>
              {persistMode === "session" ? (
                <span className="text-sm text-muted-foreground">
                  This tab only
                </span>
              ) : null}
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handleManageKey}
              aria-describedby="board-key-copy"
            >
              Add TfL API key
            </Button>
          )}
        </div>
        {error && status === "invalid" ? (
          <p className="text-sm text-destructive" role="alert">
            {error.message}
          </p>
        ) : null}
      </section>
    </div>
  )
}
