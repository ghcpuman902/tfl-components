"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import {
  BoardAdvancedConfig,
  BoardQuickConfig,
} from "@/components/board/board-config-form"
import { BoardPreview } from "@/components/board/board-preview"
import { BoardShareCard } from "@/components/board/board-share-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  matchBoardPresetId,
  type BoardPresetDef,
  type BoardPresetId,
} from "@/lib/tfl/board-presets"
import type { BoardSettingId } from "@/lib/tfl/board-settings"
import {
  boardConfigForShare,
  boardKeyModeFromPersist,
  buildShareableBoardHref,
  buildShareableBoardUrl,
  type BoardKeyMode,
} from "@/lib/tfl/board-share"
import {
  BOARD_VIEW_PATH,
  boardHashFromConfig,
  describeBoardHrefSegments,
  DEFAULT_BOARD_CONFIG,
  parseBoardConfig,
  type BoardConfig,
} from "@/lib/tfl/board-url-state"
import { HOME_RAIL_STOP } from "@/lib/tfl/home-arrivals-stops"
import { cn } from "@/lib/utils"

const subscribeToOrigin = () => () => undefined
const getBrowserOrigin = () => window.location.origin
const getServerOrigin = () => ""
const getClientHash = () => window.location.hash
const getServerHash = () => ""
const getClientReady = () => true
const getServerReady = () => false

const PRESET_FEEDBACK_MOTION = "duration-300 ease-[cubic-bezier(0.05,0,0,1)]"

const configFromHash = (hash: string): BoardConfig => {
  const parsed = parseBoardConfig(hash)
  return {
    ...parsed,
    stop: parsed.stop ?? HOME_RAIL_STOP.id,
  }
}

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
  locateBusy,
  onSelect,
  onLocate,
}: {
  preset: BoardPresetDef
  active: boolean
  locateBusy: boolean
  onSelect: () => void
  onLocate: () => void
}) => {
  const itemRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (!active) return
    const item = itemRef.current
    const scroller = item?.parentElement
    if (!item || !scroller) return
    const itemRect = item.getBoundingClientRect()
    const scrollerRect = scroller.getBoundingClientRect()
    if (
      itemRect.left >= scrollerRect.left - 1 &&
      itemRect.right <= scrollerRect.right + 1
    ) {
      return
    }
    item.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    })
  }, [active])

  return (
    <li
      ref={itemRef}
      className="group/preset relative isolate z-0 w-52 shrink-0 scroll-mx-[max(1rem,calc((100vw-80rem)/2))] sm:w-56"
      aria-current={active ? "true" : undefined}
    >
      <PresetCardFeedback />
      <Card
        className={cn(
          "relative z-10 h-full gap-2 py-2",
          active ? "ring-2 ring-primary" : "bg-muted/30 text-muted-foreground"
        )}
      >
        <button
          type="button"
          className="flex w-full flex-col gap-2 text-left"
          onClick={onSelect}
          aria-label={`Use ${preset.title} layout`}
          aria-pressed={active}
        >
          <CardContent className="px-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- captured board screenshot thumbnail */}
            <img
              src={`/board/presets/${preset.id}.png`}
              alt=""
              className="h-20 w-full rounded-lg bg-background object-cover object-top"
            />
          </CardContent>
          <CardHeader className="px-3">
            <CardTitle className="text-base text-foreground">
              {preset.title}
            </CardTitle>
            {preset.description ? (
              <p className="text-sm text-muted-foreground">
                {preset.description}
              </p>
            ) : null}
          </CardHeader>
        </button>
        {preset.id === "near" ? (
          <CardHeader className="px-3 pt-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="relative z-20"
              onClick={onLocate}
              disabled={locateBusy}
            >
              {locateBusy ? "Finding nearby stops…" : "Locate near me"}
            </Button>
          </CardHeader>
        ) : null}
      </Card>
    </li>
  )
}

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

const formSettingsFromSlots = (config: BoardConfig): BoardSettingId[] => {
  const resolved = resolveBoardSlots(config.slots.p1, config.slots.p2)
  const ids = new Set<BoardSettingId>(["behaviour"])
  if (boardSlotsInclude(resolved, "rail")) {
    ids.add("stop")
    ids.add("stopName")
    ids.add("arrivalsLines")
    ids.add("arrivalsRows")
    ids.add("arrivalsPinFirst")
  }
  if (boardSlotsInclude(resolved, "bus")) {
    ids.add("busStop")
    ids.add("busRoutes")
    ids.add("busRows")
  }
  if (boardSlotsInclude(resolved, "river")) {
    ids.add("riverStop")
    ids.add("riverRows")
  }
  if (boardSlotsInclude(resolved, "cycle")) {
    ids.add("cycleDocks")
    ids.add("cycleTiles")
  }
  if (boardSlotsInclude(resolved, "status")) {
    ids.add("statusSurface")
    ids.add("statusTiles")
    ids.add("statusLines")
    ids.add("statusOverview")
  }
  return [...ids]
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
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [locateBusy, setLocateBusy] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)
  const [keyModeOverride, setKeyModeOverride] = useState<BoardKeyMode | null>(
    null
  )
  const origin = useSyncExternalStore(
    subscribeToOrigin,
    getBrowserOrigin,
    getServerOrigin
  )
  const hash = useSyncExternalStore(
    subscribeToOrigin,
    getClientHash,
    getServerHash
  )
  const isClient = useSyncExternalStore(
    subscribeToOrigin,
    getClientReady,
    getServerReady
  )
  const [prevHash, setPrevHash] = useState<string | null>(null)

  if (isClient && prevHash === null) {
    setPrevHash(hash)
    if (hash) {
      const next = configFromHash(hash)
      setConfig(next)
      const matched = matchBoardPresetId(next)
      if (matched) setPresetId(matched)
    }
  }

  const availablePresets = BOARD_PRESETS.filter((item) => item.available)
  const formSettings = useMemo(() => formSettingsFromSlots(config), [config])
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
    hasKey
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

  useEffect(() => {
    if (!isClient) return
    const nextHash = boardHashFromConfig(shareConfig)
    if (window.location.hash === nextHash) return
    const url = `${window.location.pathname}${window.location.search}${nextHash}`
    window.history.replaceState(window.history.state, "", url)
  }, [isClient, shareConfig])

  useEffect(() => {
    if (!isClient) return
    const handlePop = () => {
      const next = configFromHash(window.location.hash)
      setConfig(next)
      const matched = matchBoardPresetId(next)
      if (matched) setPresetId(matched)
    }
    window.addEventListener("popstate", handlePop)
    return () => window.removeEventListener("popstate", handlePop)
  }, [isClient])

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

  const handleSelectRecipe = (id: BoardPresetId) => {
    const nextPreset = getBoardPreset(id)
    setPresetId(id)
    setConfig((current) => applyBoardRecipe(current, nextPreset))
    setAdvancedOpen(id !== DEFAULT_BOARD_PRESET_ID)
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
          setAdvancedOpen(true)
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
        } catch (err) {
          setLocateError(
            err instanceof Error ? err.message : "Could not find nearby stops."
          )
        } finally {
          setLocateBusy(false)
        }
      },
      (geoError) => {
        setLocateBusy(false)
        setLocateError(
          geoError.message ||
            "Location permission is needed to find nearby stops."
        )
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 30_000 }
    )
  }

  const formProps = {
    config,
    formSettings,
    servingLines: lookupBoardStationLines(stationLines, config.stop),
    lineGroups: lookupBoardStationLineGroups(config.stop),
    autoStopName,
    stations,
    onChange: handleConfigChange,
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2" aria-labelledby="board-layouts-heading">
        <h2 id="board-layouts-heading" className="text-lg font-semibold">
          Layout
        </h2>
        <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2">
          <ul
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto overscroll-x-contain py-3 scrollbar-none px-[max(1rem,calc((100vw-80rem)/2))] scroll-px-[max(1rem,calc((100vw-80rem)/2))]"
            aria-label="Board layouts"
            tabIndex={0}
          >
            {availablePresets.map((item) => (
              <PresetCard
                key={item.id}
                preset={item}
                active={item.id === presetId}
                locateBusy={locateBusy}
                onSelect={() => handleSelectRecipe(item.id)}
                onLocate={handleLocate}
              />
            ))}
          </ul>
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-background to-transparent transition-opacity duration-150 ease-[ease] sm:w-10",
              showEndFade ? "opacity-100" : "opacity-0"
            )}
          />
        </div>
        {locateError ? (
          <p className="text-sm text-destructive" role="alert">
            {locateError}
          </p>
        ) : null}
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(18rem,2fr)_minmax(0,3fr)]">
        <div className="order-1 min-w-0 space-y-5">
          <BoardQuickConfig {...formProps} />
          <BoardShareCard
            url={absoluteUrl}
            href={href}
            keyMode={keyMode}
            onKeyModeChange={handleKeyModeChange}
            hasKey={hasKey}
            appKeyMasked={appKeyMasked}
            persistMode={persistMode}
            onManageKey={openDialog}
          />
          {error && status === "invalid" ? (
            <p className="text-sm text-destructive" role="alert">
              {error.message}
            </p>
          ) : null}
        </div>

        <BoardPreview
          className="order-2 min-w-0 lg:sticky lg:top-[calc(var(--site-header-height)+1rem)]"
          href={href}
          hydrated={hydrated}
          hasKey={hasKey}
          onAddKey={openDialog}
        />
      </div>

      <BoardAdvancedConfig
        {...formProps}
        segments={segments}
        legendPath={legendPath}
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
      />
    </div>
  )
}
