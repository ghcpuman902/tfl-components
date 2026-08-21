"use client"

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { BoardAdvancedConfig } from "@/components/board/board-config-form"
import { BoardLineChipPicker } from "@/components/board/board-line-chip-picker"
import { BoardPreview } from "@/components/board/board-preview"
import { BoardShareCard } from "@/components/board/board-share-card"
import { BoardStationSearch } from "@/components/board/board-station-search"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUserTflCredentials } from "@/components/user-tfl-credentials-provider"
import { useLandingTrack } from "@/components/landing/landing-analytics"
import type { AnalyticsContext } from "@/lib/analytics/context"
import { defaultAnalyticsContext } from "@/lib/analytics/context"
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
  goToBoardStage,
  markBoardSetupCompleted,
  markBoardSetupStarted,
  parseBoardSetupDraft,
  BOARD_SETUP_DRAFT_STORAGE_KEY,
  BOARD_STAGE_LABELS,
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
  const [detected, setDetected] = useState(() =>
    detectScreenProfile(1280, 800)
  )
  const [locateBusy, setLocateBusy] = useState(false)
  const [locateMessage, setLocateMessage] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [keyDraft, setKeyDraft] = useState("")
  const [keyHelpOpen, setKeyHelpOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const lastAnnounce = useRef("")

  useEffect(() => {
    const stored = readDraft()
    setDraft(
      stored ??
        createBoardSetupDraft(
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : "draft-local"
        )
    )
    setDetected(detectScreenProfile(window.innerWidth, window.innerHeight))
    setReady(true)
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
  const isExample =
    !draft.screenProfile && !draft.stopId && !draft.continueWithoutStop
  const announce = [
    draft.screenProfile ? `Screen ${draft.screenProfile}` : "Example board",
    draft.continueWithoutStop
      ? "Network status"
      : (draft.stopName ?? autoStopName ?? EXAMPLE_STOP.name),
  ].join(". ")

  useEffect(() => {
    if (announce === lastAnnounce.current) return
    lastAnnounce.current = announce
  }, [announce])

  const completeSetup = (reason: "open" | "copy" | "qr") => {
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
  }

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocateMessage("Location is not available. Search for a stop instead.")
      window.requestAnimationFrame(() => searchInputRef.current?.focus())
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
            searchInputRef.current?.focus()
            return
          }
          const rail = result.rail
          updateDraft((current) =>
            startIfNeeded({
              ...current,
              locationUsed: true,
              continueWithoutStop: false,
              stopId: rail?.id ?? current.stopId,
              stopName: rail?.name ?? current.stopName,
              nearbyModes: [
                result.bus ? "bus" : null,
                result.river ? "river" : null,
                result.docks.length > 0 ? "cycle" : null,
              ].filter((item): item is "bus" | "river" | "cycle" =>
                Boolean(item)
              ),
            })
          )
        } catch {
          setLocateMessage("Could not find a nearby stop. Search instead.")
          searchInputRef.current?.focus()
        } finally {
          setLocateBusy(false)
        }
      },
      () => {
        setLocateBusy(false)
        setLocateMessage("Location was not shared. Search for a stop instead.")
        searchInputRef.current?.focus()
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

  const preview = (
    <BoardPreview
      className="min-w-0 lg:sticky lg:top-[calc(var(--site-header-height)+1rem)]"
      href={href}
      hydrated={hydrated}
      hasKey={hasKey}
      onAddKey={openDialog}
      requireKeyOverlay={false}
      exampleLabel={
        isExample ? `Example · ${EXAMPLE_STOP.name}` : undefined
      }
    />
  )

  return (
    <div className="space-y-8">
      <ol className="flex flex-wrap gap-2 text-sm" aria-label="Setup steps">
        {([1, 2, 3, 4, 5] as const).map((stage) => (
          <li key={stage}>
            <button
              type="button"
              className={cn(
                "rounded-md px-2 py-1",
                draft.stage === stage
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => updateDraft((current) => goToBoardStage(current, stage))}
              aria-current={draft.stage === stage ? "step" : undefined}
            >
              {stage} {BOARD_STAGE_LABELS[stage]}
            </button>
          </li>
        ))}
      </ol>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(18rem,2fr)_minmax(0,3fr)]">
        <div className="order-1 min-w-0 space-y-6">
          {draft.stage === 1 ? (
            <section className="space-y-4" aria-labelledby="board-stage-1">
              <h2 id="board-stage-1" className="text-xl font-semibold">
                Where will your board live?
              </h2>
              <div className="grid gap-3">
                {(
                  [
                    ["this", `This screen (Recommended) · ${detected.sizeLabel}`],
                    ["small", "Small screen"],
                    ["large", "Large screen"],
                  ] as const satisfies readonly [
                    BoardScreenProfile,
                    string,
                  ][]
                ).map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    variant={
                      draft.screenProfile === value ? "default" : "outline"
                    }
                    className="h-auto justify-start px-4 py-3 text-left whitespace-normal"
                    onClick={() => {
                      updateDraft((current) =>
                        startIfNeeded({
                          ...current,
                          screenProfile: value,
                        })
                      )
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <Button type="button" onClick={() => finishStage(1)}>
                Continue
              </Button>
            </section>
          ) : null}

          {draft.stage === 2 ? (
            <section className="space-y-4" aria-labelledby="board-stage-2">
              <h2 id="board-stage-2" className="text-xl font-semibold">
                Which stop should this board follow?
              </h2>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={handleLocate}
                  disabled={locateBusy}
                >
                  {locateBusy ? "Finding a stop…" : "Use my location"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
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
                  Continue without a stop
                </Button>
              </div>
              {locateMessage ? (
                <p className="text-sm text-muted-foreground" role="status">
                  {locateMessage}
                </p>
              ) : null}
              <div>
                <p className="mb-2 text-sm font-medium">Search</p>
                <BoardStationSearch
                  stations={stations}
                  stopId={draft.stopId ?? undefined}
                  onStopChange={(stop) => {
                    const item = stations.find(
                      (station) =>
                        station.id === stop || station.aliasIds.includes(stop)
                    )
                    updateDraft((current) =>
                      startIfNeeded({
                        ...current,
                        continueWithoutStop: false,
                        stopId: stop,
                        stopName: item?.name ?? null,
                        lineIds: (
                          lookupBoardStationLines(stationLines, stop) ?? []
                        ).map((line) => line.lineId),
                      })
                    )
                  }}
                />
              </div>
              <Button
                type="button"
                onClick={() => finishStage(2)}
                disabled={!draft.stopId && !draft.continueWithoutStop}
              >
                Continue
              </Button>
            </section>
          ) : null}

          {draft.stage === 3 ? (
            <section className="space-y-4" aria-labelledby="board-stage-3">
              <h2 id="board-stage-3" className="text-xl font-semibold">
                Services
              </h2>
              {draft.continueWithoutStop ? (
                <p className="text-muted-foreground">
                  This board follows network status, not a stop.
                </p>
              ) : (
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
                      {(["bus", "river", "cycle"] as const).map((mode) => (
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
                              nearbyModes: current.nearbyModes.includes(mode)
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
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">
                      Additional status lines
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Status only — these lines do not serve this stop.
                    </p>
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
              <Button type="button" onClick={() => finishStage(3)}>
                Continue
              </Button>
            </section>
          ) : null}

          {draft.stage === 4 ? (
            <section className="space-y-4" aria-labelledby="board-stage-4">
              <h2 id="board-stage-4" className="text-xl font-semibold">
                Keep your board live
              </h2>
              {!hasKey ? (
                <p className="text-sm text-muted-foreground" role="status">
                  Shared data · add a TfL key for your own quota
                </p>
              ) : (
                <p className="text-sm text-muted-foreground" role="status">
                  Using your TfL key {appKeyMasked}
                </p>
              )}
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="board-tfl-key">
                  Add my TfL key (Recommended)
                </label>
                <Input
                  id="board-tfl-key"
                  type="password"
                  autoComplete="off"
                  value={keyDraft}
                  onChange={(event) => setKeyDraft(event.target.value)}
                  spellCheck={false}
                />
                <Button
                  type="button"
                  onClick={async () => {
                    if (!keyDraft.trim()) return
                    const result = await save(keyDraft, "local")
                    if (result.ok) {
                      updateDraft((current) => ({
                        ...current,
                        keyMode: "own",
                      }))
                    }
                  }}
                >
                  Save key
                </Button>
                {error && status === "invalid" ? (
                  <p className="text-sm text-destructive" role="alert">
                    {error.message}
                  </p>
                ) : null}
              </div>
              <details
                open={keyHelpOpen}
                onToggle={(event) =>
                  setKeyHelpOpen(event.currentTarget.open)
                }
              >
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  How to get a TfL key
                </summary>
                <p className="mt-2 max-w-prose text-sm text-muted-foreground">
                  Register at{" "}
                  <a
                    href="https://api-portal.tfl.gov.uk/"
                    className="text-foreground underline underline-offset-4"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    api-portal.tfl.gov.uk
                  </a>
                  , subscribe to 500 Requests per min, then copy Primary or
                  Secondary from Profile.
                </p>
              </details>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  updateDraft((current) => ({
                    ...current,
                    keyMode: current.keyMode ?? "shared",
                  }))
                  finishStage(4)
                }}
              >
                Continue with shared data
              </Button>
              {hasKey ? (
                <Button type="button" onClick={() => finishStage(4)}>
                  Continue
                </Button>
              ) : null}
            </section>
          ) : null}

          {draft.stage === 5 ? (
            <section className="space-y-4" aria-labelledby="board-stage-5">
              <h2 id="board-stage-5" className="text-xl font-semibold">
                Ready
              </h2>
              <ul className="space-y-2 text-sm">
                <li>
                  Screen: {draft.screenProfile ?? "this"}{" "}
                  <button
                    type="button"
                    className="underline underline-offset-4"
                    onClick={() =>
                      updateDraft((current) => goToBoardStage(current, 1))
                    }
                  >
                    Edit
                  </button>
                </li>
                <li>
                  Stop:{" "}
                  {draft.continueWithoutStop
                    ? "Network status"
                    : (draft.stopName ?? autoStopName ?? "Example")}{" "}
                  <button
                    type="button"
                    className="underline underline-offset-4"
                    onClick={() =>
                      updateDraft((current) => goToBoardStage(current, 2))
                    }
                  >
                    Edit
                  </button>
                </li>
                <li>
                  Key: {draft.keyMode === "own" ? "your key" : "shared data"}{" "}
                  <button
                    type="button"
                    className="underline underline-offset-4"
                    onClick={() =>
                      updateDraft((current) => goToBoardStage(current, 4))
                    }
                  >
                    Edit
                  </button>
                </li>
              </ul>
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
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  nativeButton={false}
                  render={
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => completeSetup("open")}
                    />
                  }
                >
                  Open full-screen
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    completeSetup("copy")
                    if (absoluteUrl) {
                      void navigator.clipboard.writeText(absoluteUrl)
                    }
                  }}
                >
                  Copy setup link
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => completeSetup("qr")}
                >
                  QR ready
                </Button>
              </div>
            </section>
          ) : null}

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
            open={advancedOpen}
            onOpenChange={setAdvancedOpen}
          />
        </div>

        <div className="order-2 min-w-0">
          <div className="lg:hidden">
            <Button
              type="button"
              variant="outline"
              className="mb-3"
              onClick={() => setPreviewOpen((open) => !open)}
              aria-expanded={previewOpen}
            >
              {previewOpen ? "Hide preview" : "Show preview"}
            </Button>
            {previewOpen ? preview : null}
          </div>
          <div className="hidden lg:block">{preview}</div>
        </div>
      </div>
    </div>
  )
}
