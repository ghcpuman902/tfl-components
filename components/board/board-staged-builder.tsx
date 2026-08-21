"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { BoardAdvancedConfig } from "@/components/board/board-config-form"
import { BoardLineChipPicker } from "@/components/board/board-line-chip-picker"
import { BoardPreview } from "@/components/board/board-preview"
import { BoardPreviewModePills } from "@/components/board/board-preview-mode"
import { BoardShareCard } from "@/components/board/board-share-card"
import { BoardStationSearch } from "@/components/board/board-station-search"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useUserTflCredentials } from "@/components/user-tfl-credentials-provider"
import {
  TFL_API_PORTAL_URL,
  TflApiKeyObtainLinks,
  TflApiKeyPortalNote,
} from "@/components/user-tfl-api-key-copy"
import { useLandingTrack } from "@/components/landing/landing-analytics"
import type { AnalyticsContext } from "@/lib/analytics/context"
import { defaultAnalyticsContext } from "@/lib/analytics/context"
import { elapsedSinceExposureMs } from "@/lib/landing/timing"
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
import type { BoardSettingId } from "@/lib/tfl/board-settings"
import {
  boardConfigForShare,
  boardKeyModeFromPersist,
  buildShareableBoardHref,
  buildShareableBoardUrl,
  type BoardKeyMode,
} from "@/lib/tfl/board-share"
import {
  completeBoardStage,
  createBoardSetupDraft,
  detectScreenProfile,
  markBoardSetupCompleted,
  markBoardSetupStarted,
  parseBoardSetupDraft,
  BOARD_SETUP_DRAFT_STORAGE_KEY,
  type BoardScreenProfile,
  type BoardSetupDraft,
  type BoardSetupStage,
} from "@/lib/tfl/board-setup-state"
import {
  BOARD_VIEW_PATH,
  DEFAULT_BOARD_CONFIG,
  describeBoardHrefSegments,
  type BoardConfig,
} from "@/lib/tfl/board-url-state"
import { HOME_RAIL_STOP } from "@/lib/tfl/home-arrivals-stops"
import { LINE_ORDER } from "tfl-ts"
import { getLineNameTiers } from "@/lib/tfl/line-names"
import { cn } from "@/lib/utils"

const subscribe = () => () => undefined
const getOrigin = () => window.location.origin
const getServerOrigin = () => ""

const EXAMPLE_STOP = HOME_RAIL_STOP

const LockedRegion = ({
  locked,
  children,
  className,
}: {
  locked: boolean
  children: ReactNode
  className?: string
}) => (
  <div className={cn("relative min-w-0", className)}>
    <div
      className={cn(locked && "pointer-events-none select-none")}
      inert={locked || undefined}
    >
      {children}
    </div>
    {locked ? (
      <div className="absolute inset-0 z-10 bg-background/60" aria-hidden />
    ) : null}
  </div>
)

const persistDraft = (draft: BoardSetupDraft) => {
  try {
    window.localStorage.setItem(
      BOARD_SETUP_DRAFT_STORAGE_KEY,
      JSON.stringify(draft)
    )
  } catch {
    // Soft-fail — setup must still work.
  }
}

const readDraft = (): BoardSetupDraft | null => {
  try {
    const raw = window.localStorage.getItem(BOARD_SETUP_DRAFT_STORAGE_KEY)
    if (!raw) return null
    return parseBoardSetupDraft(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

const formSettingsFromConfig = (config: BoardConfig): BoardSettingId[] => {
  const resolved = resolveBoardSlots(config.slots.p1, config.slots.p2)
  const ids = new Set<BoardSettingId>(["behaviour"])
  if (boardSlotsInclude(resolved, "rail")) {
    ids.add("stop")
    ids.add("stopName")
    ids.add("arrivalsLines")
    ids.add("arrivalsRows")
    ids.add("arrivalsPinFirst")
  }
  if (boardSlotsInclude(resolved, "status")) {
    ids.add("statusSurface")
    ids.add("statusTiles")
    ids.add("statusLines")
    ids.add("statusOverview")
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
  return [...ids]
}

const configFromDraft = (draft: BoardSetupDraft): BoardConfig => {
  if (draft.continueWithoutStop) {
    return {
      ...DEFAULT_BOARD_CONFIG,
      slots: { p1: ["status"], p2: [] },
      status: {
        lines: draft.statusLineIds.length > 0 ? draft.statusLineIds : undefined,
      },
    }
  }

  const stop = draft.stopId ?? EXAMPLE_STOP.id
  const p1: Array<"rail" | "bus" | "cycle" | "river"> = ["rail"]
  if (draft.nearbyModes.includes("bus")) p1.push("bus")
  if (draft.nearbyModes.includes("cycle")) p1.push("cycle")
  if (draft.nearbyModes.includes("river")) p1.push("river")

  return {
    ...DEFAULT_BOARD_CONFIG,
    stop,
    stopName: draft.stopName ?? undefined,
    slots: { p1, p2: ["status"] },
    arrivals: {
      lineOrder: draft.lineIds.length > 0 ? draft.lineIds : undefined,
    },
    status: {
      lines: draft.statusLineIds.length > 0 ? draft.statusLineIds : undefined,
    },
  }
}

type BoardStagedBuilderProps = {
  stationLines: BoardStationLinesIndex
  stationNames: BoardStationNamesIndex
  stations: readonly BoardStationSearchItem[]
  analyticsContext?: AnalyticsContext
}

export const BoardStagedBuilder = ({
  stationLines,
  stationNames,
  stations,
  analyticsContext = defaultAnalyticsContext("control"),
}: BoardStagedBuilderProps) => {
  const track = useLandingTrack(analyticsContext)
  const {
    hydrated,
    appKeyMasked,
    persistMode,
    error,
    getAppKey,
    openDialog,
    save,
    status,
  } = useUserTflCredentials()
  const [draft, setDraft] = useState<BoardSetupDraft>(createBoardSetupDraft)
  const [ready, setReady] = useState(false)
  const [locateBusy, setLocateBusy] = useState(false)
  const [locateMessage, setLocateMessage] = useState<string | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [keyDraft, setKeyDraft] = useState("")
  const [keyHelpOpen, setKeyHelpOpen] = useState(false)
  const searchWrapRef = useRef<HTMLDivElement | null>(null)
  const lastAnnounce = useRef("")

  const focusSearch = () => {
    window.requestAnimationFrame(() => {
      searchWrapRef.current?.querySelector("input")?.focus()
    })
  }

  useEffect(() => {
    const stored = readDraft()
    const next =
      stored ??
      createBoardSetupDraft(
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : "draft-local"
      )
    const nextDetected = detectScreenProfile(
      window.innerWidth,
      window.innerHeight
    )
    const frame = window.requestAnimationFrame(() => {
      const desktop = window.innerWidth >= 1024
      setDraft({
        ...next,
        screenProfile: next.screenProfile ?? nextDetected.profile,
        stage: next.stage === 1 && desktop ? 2 : next.stage,
      })
      setReady(true)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (!ready) return
    persistDraft(draft)
  }, [draft, ready])

  const updateDraft = (
    next: BoardSetupDraft | ((current: BoardSetupDraft) => BoardSetupDraft)
  ) => {
    setDraft((current) =>
      typeof next === "function" ? next(current) : next
    )
  }

  const startIfNeeded = (current: BoardSetupDraft) => {
    if (current.setupStarted) return current
    track("board_setup_started", {
      stage: current.stage,
      screenProfile: current.screenProfile ?? undefined,
      time_to_setup_start_ms: elapsedSinceExposureMs(),
    })
    return markBoardSetupStarted(current)
  }

  const finishStage = (stage: BoardSetupStage) => {
    updateDraft((current) => {
      const started = startIfNeeded(current)
      const completed = completeBoardStage(started, stage)
      track("board_stage_completed", {
        stage,
        screenProfile: completed.screenProfile ?? undefined,
        locationUsed: completed.locationUsed,
        stopSelected: Boolean(completed.stopId) && !completed.continueWithoutStop,
        modesCount:
          completed.lineIds.length +
          completed.nearbyModes.length +
          completed.statusLineIds.length,
        keyMode: completed.keyMode ?? undefined,
      })
      return completed
    })
  }

  const config = useMemo(() => configFromDraft(draft), [draft])
  const servingLines = lookupBoardStationLines(stationLines, config.stop) ?? []
  const lineGroups = lookupBoardStationLineGroups(config.stop)
  const autoStopName = lookupBoardStationName(stationNames, config.stop)
  const formSettings = useMemo(() => formSettingsFromConfig(config), [config])
  const appKey = hydrated ? (getAppKey() ?? "") : ""
  const hasKey = Boolean(appKey)
  const origin = useSyncExternalStore(subscribe, getOrigin, getServerOrigin)
  const inferredKeyMode = boardKeyModeFromPersist(
    hydrated ? persistMode : undefined,
    hasKey
  )
  const keyMode: BoardKeyMode =
    draft.keyMode === "own" && inferredKeyMode === "browser"
      ? "browser"
      : "portable"

  const forUrl = useMemo(
    () => ({
      ...config,
      stop: config.stop?.trim() || undefined,
      stopName: resolveBoardStopNameOverride(config.stopName, autoStopName),
      key: appKey.trim() || undefined,
    }),
    [appKey, autoStopName, config]
  )
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
  const announce = draft.continueWithoutStop
    ? "Network status"
    : (draft.stopName ?? autoStopName ?? "")

  useEffect(() => {
    if (announce === lastAnnounce.current) return
    lastAnnounce.current = announce
  }, [announce])

  const completeSetup = useCallback((reason: "open" | "copy" | "qr") => {
    void reason
    updateDraft((current) => {
      const { draft: next, firstCompletion } = markBoardSetupCompleted(current)
      if (firstCompletion) {
        track("board_setup_completed", {
          stage: 5,
          screenProfile: next.screenProfile ?? undefined,
          locationUsed: next.locationUsed,
          stopSelected: Boolean(next.stopId) && !next.continueWithoutStop,
          keyMode: next.keyMode ?? undefined,
        })
      }
      return next
    })
  }, [track])

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocateMessage("Location is not available.")
      setAdvancedOpen(true)
      focusSearch()
      return
    }
    setLocateBusy(true)
    setLocateMessage(null)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const result = await getBoardNearbyPlaces(
            position.coords.latitude,
            position.coords.longitude
          )
          if (!result.ok) {
            setLocateMessage(result.error)
            setAdvancedOpen(true)
            focusSearch()
            return
          }
          const rail = result.rail
          const lineIds = rail
            ? (lookupBoardStationLines(stationLines, rail.id) ?? []).map(
                (line) => line.lineId
              )
            : []
          updateDraft((current) =>
            startIfNeeded({
              ...current,
              locationUsed: true,
              continueWithoutStop: false,
              stopId: rail?.id ?? current.stopId,
              stopName: rail?.name ?? current.stopName,
              lineIds: lineIds.length > 0 ? lineIds : current.lineIds,
              nearbyModes: [
                result.bus ? "bus" : null,
                result.river ? "river" : null,
                result.docks.length > 0 ? "cycle" : null,
              ].filter((item): item is "bus" | "river" | "cycle" =>
                Boolean(item)
              ),
            })
          )
          if (!rail) setAdvancedOpen(true)
        } catch {
          setLocateMessage("Could not find a nearby stop.")
          setAdvancedOpen(true)
          focusSearch()
        } finally {
          setLocateBusy(false)
        }
      },
      () => {
        setLocateBusy(false)
        setLocateMessage("Location was not shared.")
        setAdvancedOpen(true)
        focusSearch()
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 30_000 }
    )
  }

  const handleConfigChange = (next: Partial<BoardConfig>) => {
    updateDraft((current) => ({
      ...current,
      stopId: next.stop !== undefined ? next.stop || null : current.stopId,
      stopName:
        next.stopName !== undefined ? next.stopName || null : current.stopName,
      lineIds: next.arrivals?.lineOrder ?? current.lineIds,
      statusLineIds: next.status?.lines ?? current.statusLineIds,
    }))
  }

  const servingIds = servingLines.map((line) => line.lineId)
  const extraStatusLines = LINE_ORDER.filter((id) => !servingIds.includes(id)).map(
    (lineId) => ({
      lineId,
      lineName: getLineNameTiers(lineId).full,
    })
  )

  const handlePreviewMode = (profile: BoardScreenProfile) => {
    updateDraft((current) =>
      startIfNeeded({
        ...current,
        screenProfile: profile,
      })
    )
  }

  const handleSaveKey = async () => {
    if (!keyDraft.trim()) return
    const result = await save(keyDraft, "local")
    if (result.ok) {
      updateDraft((current) => ({
        ...startIfNeeded(current),
        keyMode: "own",
      }))
      finishStage(4)
    }
  }

  const locked = hydrated && !hasKey
  const previewProfile = draft.screenProfile ?? "large"
  const selectedStopLabel = draft.continueWithoutStop
    ? "Network status"
    : (draft.stopName ?? autoStopName)
  const selectedStopContext = (() => {
    if (!draft.stopId || draft.continueWithoutStop) return ""
    const item = stations.find(
      (station) =>
        station.id === draft.stopId ||
        station.aliasIds.includes(draft.stopId ?? "")
    )
    return item?.context ? ` · ${item.context}` : ""
  })()

  return (
    <div className="space-y-4">
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      <div
        className={cn(
          "grid items-start gap-3",
          "grid-cols-[minmax(0,11rem)_minmax(0,1fr)]",
          "[grid-template-areas:'key_key'_'loc_preview'_'share_share']",
          "sm:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] sm:gap-8",
          "sm:[grid-template-areas:'key_preview'_'loc_preview'_'share_preview']"
        )}
      >
          <section
            aria-labelledby="board-key-heading"
            className="[grid-area:key] space-y-2"
          >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h2
                id="board-key-heading"
                className="font-heading text-sm font-medium text-foreground"
              >
                Get a free TfL API key
              </h2>
              <a
                href={TFL_API_PORTAL_URL}
                className="text-sm text-foreground underline underline-offset-4"
                target="_blank"
                rel="noopener noreferrer"
              >
                api-portal.tfl.gov.uk
              </a>
            </div>
            {hasKey ? (
              <button
                type="button"
                className="font-mono text-sm text-foreground underline-offset-4 hover:underline"
                onClick={openDialog}
                aria-label={
                  appKeyMasked
                    ? `Manage TfL API key ending ${appKeyMasked.slice(-4)}`
                    : "Manage TfL API key"
                }
              >
                {appKeyMasked}
              </button>
            ) : (
              <form
                className="flex flex-col gap-2 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault()
                  void handleSaveKey()
                }}
              >
                <Input
                  id="board-tfl-key"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={keyDraft}
                  onChange={(event) => {
                    setKeyDraft(event.target.value)
                  }}
                  placeholder="Paste your key"
                  aria-labelledby="board-key-heading"
                  className="min-w-0 flex-1"
                />
                <Button type="submit" variant="outline" className="shrink-0">
                  Save
                </Button>
              </form>
            )}
            {error && status === "invalid" ? (
              <p className="text-sm text-destructive" role="alert">
                {error.message}
              </p>
            ) : null}
            <button
              type="button"
              className="text-sm text-muted-foreground underline underline-offset-4"
              onClick={() => setKeyHelpOpen(true)}
            >
              Teach me how
            </button>
          </section>

          <LockedRegion locked={locked} className="[grid-area:loc]">
            <div>
              <section
                aria-labelledby="board-location-heading"
                className="space-y-2"
              >
                <h2 id="board-location-heading" className="sr-only">
                  Stop
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleLocate}
                  disabled={locateBusy}
                >
                  {locateBusy ? "Finding a stop…" : "Use my location"}
                </Button>
                {locateMessage ? (
                  <p className="text-sm text-muted-foreground" role="status">
                    {locateMessage}
                  </p>
                ) : null}
                {draft.stopId || draft.continueWithoutStop ? (
                  <p className="text-sm text-foreground">
                    {selectedStopLabel}
                    {selectedStopContext}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="text-sm text-muted-foreground underline underline-offset-4"
                  onClick={() => {
                    setAdvancedOpen((open) => !open)
                    if (!advancedOpen) {
                      focusSearch()
                    }
                  }}
                  aria-expanded={advancedOpen}
                >
                  Customise
                </button>
                {advancedOpen ? (
                  <div className="space-y-4 pt-1">
                    <div ref={searchWrapRef}>
                      <BoardStationSearch
                        stations={stations}
                        stopId={draft.stopId ?? undefined}
                        onStopChange={(stop) => {
                          const item = stations.find(
                            (station) =>
                              station.id === stop ||
                              station.aliasIds.includes(stop)
                          )
                          updateDraft((current) =>
                            startIfNeeded({
                              ...current,
                              continueWithoutStop: false,
                              stopId: stop,
                              stopName: item?.name ?? null,
                              lineIds: (
                                lookupBoardStationLines(stationLines, stop) ??
                                []
                              ).map((line) => line.lineId),
                            })
                          )
                          if (stop) {
                            finishStage(2)
                            finishStage(3)
                          }
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="text-sm text-muted-foreground underline underline-offset-4"
                      onClick={() => {
                        updateDraft((current) =>
                          startIfNeeded({
                            ...current,
                            continueWithoutStop: true,
                            stopId: null,
                            stopName: null,
                          })
                        )
                        finishStage(2)
                      }}
                    >
                      Network status only
                    </button>
                    {draft.continueWithoutStop ? null : (
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-medium">At this stop</h3>
                          <BoardLineChipPicker
                            lines={servingLines}
                            selected={draft.lineIds}
                            onChange={(lineOrder) =>
                              updateDraft((current) => ({
                                ...current,
                                lineIds: lineOrder ? [...lineOrder] : [],
                              }))
                            }
                          />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium">Nearby</h3>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(["bus", "river", "cycle"] as const).map(
                              (mode) => (
                                <Button
                                  key={mode}
                                  type="button"
                                  size="sm"
                                  variant={
                                    draft.nearbyModes.includes(mode)
                                      ? "default"
                                      : "outline"
                                  }
                                  onClick={() =>
                                    updateDraft((current) => ({
                                      ...current,
                                      nearbyModes:
                                        current.nearbyModes.includes(mode)
                                          ? current.nearbyModes.filter(
                                              (item) => item !== mode
                                            )
                                          : [...current.nearbyModes, mode],
                                    }))
                                  }
                                >
                                  {mode === "bus"
                                    ? "Bus"
                                    : mode === "river"
                                      ? "River"
                                      : "Cycle hire"}
                                </Button>
                              )
                            )}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium">
                            Additional status lines
                          </h3>
                          <BoardLineChipPicker
                            lines={extraStatusLines}
                            selected={draft.statusLineIds}
                            onChange={(lineOrder) =>
                              updateDraft((current) => ({
                                ...current,
                                statusLineIds: lineOrder ? [...lineOrder] : [],
                              }))
                            }
                          />
                        </div>
                      </div>
                    )}
                    <BoardAdvancedConfig
                      config={config}
                      formSettings={formSettings}
                      servingLines={servingLines}
                      lineGroups={lineGroups}
                      autoStopName={autoStopName}
                      stations={stations}
                      segments={segments}
                      legendPath={legendPath}
                      onChange={handleConfigChange}
                      open
                      onOpenChange={setAdvancedOpen}
                      hideTrigger
                    />
                  </div>
                ) : null}
              </section>
            </div>
          </LockedRegion>

          <LockedRegion locked={locked} className="[grid-area:share]">
              <section aria-labelledby="board-share-heading" className="space-y-2">
                <h2
                  id="board-share-heading"
                  className="font-heading text-sm font-medium text-foreground"
                >
                  Share the link
                </h2>
                <BoardShareCard
                  url={absoluteUrl}
                  href={href}
                  keyMode={keyMode}
                  onKeyModeChange={(checked) => {
                    if (checked && appKey.trim()) void save(appKey, "local")
                  }}
                  hasKey={hasKey}
                  appKeyMasked={appKeyMasked}
                  persistMode={persistMode}
                  onManageKey={openDialog}
                  onOpen={() => completeSetup("open")}
                  onCopy={() => completeSetup("copy")}
                  onQrRendered={() => completeSetup("qr")}
                />
              </section>
          </LockedRegion>

        <LockedRegion locked={locked} className="[grid-area:preview]">
          <div className="flex w-full flex-col items-center gap-3 lg:sticky lg:top-[calc(var(--site-header-height)+1rem)]">
            <BoardPreview
              className="min-w-0"
              href={href}
              hydrated={hydrated}
              hasKey={hasKey}
              onAddKey={openDialog}
              requireKeyOverlay={false}
              screenProfile={previewProfile}
              compact
            />
            <BoardPreviewModePills
              value={previewProfile}
              onChange={handlePreviewMode}
            />
          </div>
        </LockedRegion>
      </div>

      <Sheet open={keyHelpOpen} onOpenChange={setKeyHelpOpen}>
        <SheetContent side="bottom" className="gap-0">
          <SheetHeader>
            <SheetTitle>How to get a key</SheetTitle>
            <SheetDescription>
              <TflApiKeyObtainLinks />
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3 px-4 pb-6">
            <TflApiKeyPortalNote />
            <p className="text-sm text-muted-foreground">
              The key stays in this browser.
            </p>
            <Button
              nativeButton={false}
              render={
                <a
                  href={TFL_API_PORTAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              Open TfL portal
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
