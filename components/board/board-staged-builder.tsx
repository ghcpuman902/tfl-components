"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ClipboardEvent,
  type ReactNode,
} from "react"
import { BoardAdvancedConfig } from "@/components/board/board-config-form"
import { BoardModeRoundel } from "@/components/board/board-mode-roundel"
import {
  BoardExtraStatusLineEditor,
  BoardServingLineEditor,
} from "@/components/board/board-status-line-editor"
import { BoardPreview } from "@/components/board/board-preview"
import { BoardPreviewModePills } from "@/components/board/board-preview-mode"
import { BoardShareCard } from "@/components/board/board-share-card"
import { BoardStationSearch } from "@/components/board/board-station-search"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useUserTflCredentials } from "@/components/user-tfl-credentials-provider"
import { TflApiKeyWalkthrough } from "@/components/board/tfl-api-key-walkthrough"
import { TFL_API_PORTAL_PRODUCT_URL } from "@/components/user-tfl-api-key-copy"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  CheckIcon,
  ChevronDownIcon,
  CircleXIcon,
  CopyIcon,
  ExternalLinkIcon,
  LocateIcon,
} from "lucide-react"
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
import {
  getBoardNearbyPlaces,
  getBoardNearbyPlacesForStop,
  type BoardNearbyResult,
} from "@/lib/tfl/board-nearby-action"
import { boardSlotsInclude, resolveBoardSlots } from "@/lib/tfl/board-panels"
import {
  BOARD_STATUS_CORE_LINE_IDS,
  type BoardSettingId,
} from "@/lib/tfl/board-settings"
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
  draftFromBoardConfig,
  leftoverBoardConfig,
  markBoardSetupCompleted,
  markBoardSetupStarted,
  parseBoardSetupDraft,
  BOARD_SETUP_DRAFT_STORAGE_KEY,
  type BoardNearbyMode,
  type BoardScreenProfile,
  type BoardSetupDraft,
  type BoardSetupStage,
} from "@/lib/tfl/board-setup-state"
import {
  BOARD_VIEW_PATH,
  DEFAULT_BOARD_CONFIG,
  describeBoardHrefSegments,
  hashHasBoardConfig,
  parseBoardConfig,
  type BoardConfig,
  type BoardSlotsConfig,
} from "@/lib/tfl/board-url-state"
import { HOME_RAIL_STOP } from "@/lib/tfl/home-arrivals-stops"
import {
  displayTflAppKey,
  isPlausibleTflAppKey,
} from "@/lib/tfl/user-credentials-storage"
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
      className={cn("h-full min-h-0", locked && "pointer-events-none select-none")}
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
    ids.add("arrivalsLines")
    ids.add("arrivalsRows")
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
    ids.add("cycleSurface")
    ids.add("cycleTiles")
  }
  return [...ids]
}

const priorityLineIdsFromDraft = (draft: BoardSetupDraft): readonly string[] =>
  LINE_ORDER.filter(
    (id) => draft.lineIds.includes(id) || draft.statusLineIds.includes(id)
  )

const extraStatusLineIdsForServing = (servingIds: readonly string[]) =>
  BOARD_STATUS_CORE_LINE_IDS.filter((id) => !servingIds.includes(id))

const statusConfigFromDraft = (draft: BoardSetupDraft) => {
  const lines = priorityLineIdsFromDraft(draft)
  return {
    lines: lines.length > 0 ? lines : undefined,
    overview: draft.statusOnlyThese
      ? ("selection" as const)
      : lines.length > 0
        ? ("network" as const)
        : undefined,
  }
}

const configFromDraft = (draft: BoardSetupDraft): BoardConfig => {
  if (draft.continueWithoutStop) {
    return {
      ...DEFAULT_BOARD_CONFIG,
      slots: { p1: ["status"], p2: [] },
      status: statusConfigFromDraft(draft),
    }
  }

  const stop = draft.stopId ?? EXAMPLE_STOP.id
  const p1: Array<"rail" | "bus" | "cycle" | "river"> = ["rail", "bus"]
  const includeCycle = draft.nearbyModes.includes("cycle")
  const includeRiver = draft.nearbyModes.includes("river")
  if (includeCycle) p1.push("cycle")
  if (includeRiver) p1.push("river")

  return {
    ...DEFAULT_BOARD_CONFIG,
    stop,
    stopName: draft.stopName ?? undefined,
    slots: { p1, p2: ["status"] },
    arrivals: {
      lineOrder: draft.lineIds.length > 0 ? draft.lineIds : undefined,
    },
    bus: { stop: draft.busStopId ?? undefined },
    river: includeRiver ? { stop: draft.riverStopId ?? undefined } : {},
    cycle: includeCycle ? { docks: draft.cycleDockIds } : {},
    status: statusConfigFromDraft(draft),
  }
}

const mergeBoardConfig = (
  base: BoardConfig,
  extra: Partial<BoardConfig>
): BoardConfig => ({
  ...base,
  ...extra,
  slots: extra.slots ?? base.slots,
  arrivals: { ...base.arrivals, ...extra.arrivals },
  bus: { ...base.bus, ...extra.bus },
  river: { ...base.river, ...extra.river },
  cycle: { ...base.cycle, ...extra.cycle },
  status: { ...base.status, ...extra.status },
})

const draftNeedsNearbyIds = (draft: BoardSetupDraft): boolean => {
  if (draft.continueWithoutStop) return false
  return (
    !draft.busStopId ||
    (draft.nearbyModes.includes("river") && !draft.riverStopId) ||
    (draft.nearbyModes.includes("cycle") && draft.cycleDockIds.length === 0)
  )
}

const applyNearbyIds = (
  current: BoardSetupDraft,
  result: Extract<BoardNearbyResult, { ok: true }>
): BoardSetupDraft => ({
  ...current,
  busStopId:
    !current.busStopId ? (result.bus?.id ?? current.busStopId) : current.busStopId,
  riverStopId:
    current.nearbyModes.includes("river") && !current.riverStopId
      ? (result.river?.id ?? current.riverStopId)
      : current.riverStopId,
  cycleDockIds:
    current.nearbyModes.includes("cycle") && current.cycleDockIds.length === 0
      ? result.docks
      : current.cycleDockIds,
})

const nearbyModesFromSlots = (slots: BoardSlotsConfig): BoardNearbyMode[] => {
  const resolved = resolveBoardSlots(slots.p1, slots.p2)
  const modes: BoardNearbyMode[] = []
  if (boardSlotsInclude(resolved, "bus")) modes.push("bus")
  if (boardSlotsInclude(resolved, "river")) modes.push("river")
  if (boardSlotsInclude(resolved, "cycle")) modes.push("cycle")
  return modes
}

const mergePartialBoardConfig = (
  current: Partial<BoardConfig>,
  next: Partial<BoardConfig>
): Partial<BoardConfig> => ({
  ...current,
  ...next,
  arrivals: { ...current.arrivals, ...next.arrivals },
  bus: { ...current.bus, ...next.bus },
  river: { ...current.river, ...next.river },
  cycle: { ...current.cycle, ...next.cycle },
  status: { ...current.status, ...next.status },
})

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
  analyticsContext = defaultAnalyticsContext("room"),
}: BoardStagedBuilderProps) => {
  const track = useLandingTrack(analyticsContext)
  const {
    hydrated,
    persistMode,
    error,
    getAppKey,
    openDialog,
    save,
    clear,
    status,
  } = useUserTflCredentials()
  const isMobile = useIsMobile()
  const [draft, setDraft] = useState<BoardSetupDraft>(createBoardSetupDraft)
  const [ready, setReady] = useState(false)
  const [locateBusy, setLocateBusy] = useState(false)
  const [locateMessage, setLocateMessage] = useState<string | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [advancedConfig, setAdvancedConfig] = useState<Partial<BoardConfig>>(
    {}
  )
  const [keyDraft, setKeyDraft] = useState("")
  const [keyHelpOpen, setKeyHelpOpen] = useState(false)
  const [keyCopied, setKeyCopied] = useState(false)
  const [keyFormatError, setKeyFormatError] = useState(false)
  const [keyFieldFocused, setKeyFieldFocused] = useState(false)
  const lastKeyAttempt = useRef("")
  const keyInputRef = useRef<HTMLInputElement | null>(null)
  const searchWrapRef = useRef<HTMLDivElement | null>(null)
  const lastAnnounce = useRef("")
  const nearbyFillKey = useRef<string | null>(null)

  const focusSearch = () => {
    window.requestAnimationFrame(() => {
      searchWrapRef.current?.querySelector("input")?.focus()
    })
  }

  useEffect(() => {
    const nextDetected = detectScreenProfile(
      window.innerWidth,
      window.innerHeight
    )
    const newId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : "draft-local"
    const hash = window.location.hash
    const imported =
      hashHasBoardConfig(hash) ? parseBoardConfig(hash) : null
    const importedDraft = imported
      ? draftFromBoardConfig(imported, {
          id: newId,
          screenProfile: nextDetected.profile,
        })
      : null
    const stored = importedDraft ? null : readDraft()
    const next = importedDraft ?? stored ?? createBoardSetupDraft(newId)
    if (imported && importedDraft) {
      setAdvancedConfig(leftoverBoardConfig(imported))
      setAdvancedOpen(true)
      persistDraft(importedDraft)
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`
      )
    }
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

  useEffect(() => {
    if (!hydrated) return
    const stored = getAppKey()
    const imported = advancedConfig.key?.trim()
    if (stored) {
      setKeyDraft((current) => current || stored)
      return
    }
    if (imported) {
      setKeyDraft((current) => current || imported)
    }
  }, [advancedConfig.key, getAppKey, hydrated])

  const scrollKeyInputToEnd = () => {
    const input = keyInputRef.current
    if (!input) return
    input.scrollLeft = input.scrollWidth
  }

  useLayoutEffect(() => {
    if (!keyDraft || keyFieldFocused) return
    scrollKeyInputToEnd()
  }, [keyDraft, keyFieldFocused])

  const updateDraft = (
    next: BoardSetupDraft | ((current: BoardSetupDraft) => BoardSetupDraft)
  ) => {
    setDraft((current) =>
      typeof next === "function" ? next(current) : next
    )
  }

  useEffect(() => {
    if (!ready || draft.continueWithoutStop || !draftNeedsNearbyIds(draft))
      return
    const stopId = draft.stopId ?? EXAMPLE_STOP.id
    const key = `${stopId}:${[...draft.nearbyModes].sort().join(",")}`
    if (nearbyFillKey.current === key) return
    nearbyFillKey.current = key
    void getBoardNearbyPlacesForStop(stopId).then((result) => {
      if (!result.ok) {
        nearbyFillKey.current = null
        return
      }
      updateDraft((current) => applyNearbyIds(current, result))
    })
  }, [draft, ready])

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

  const config = useMemo(
    () => mergeBoardConfig(configFromDraft(draft), advancedConfig),
    [advancedConfig, draft]
  )
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
      key: appKey.trim() || config.key?.trim() || undefined,
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
              statusLineIds:
                lineIds.length > 0
                  ? extraStatusLineIdsForServing(lineIds)
                  : current.statusLineIds,
              busStopId: result.bus?.id ?? null,
              riverStopId: result.river?.id ?? null,
              cycleDockIds: result.docks,
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
    setAdvancedConfig((current) => mergePartialBoardConfig(current, next))
    updateDraft((current) => ({
      ...current,
      stopId: next.stop !== undefined ? next.stop || null : current.stopId,
      stopName:
        next.stopName !== undefined ? next.stopName || null : current.stopName,
      lineIds: next.arrivals?.lineOrder ?? current.lineIds,
      statusLineIds: next.status?.lines ?? current.statusLineIds,
      nearbyModes:
        next.slots !== undefined
          ? nearbyModesFromSlots(next.slots)
          : current.nearbyModes,
      busStopId:
        next.bus?.stop !== undefined ? next.bus.stop || null : current.busStopId,
      riverStopId:
        next.river?.stop !== undefined
          ? next.river.stop || null
          : current.riverStopId,
      cycleDockIds:
        next.cycle?.docks !== undefined
          ? next.cycle.docks
          : current.cycleDockIds,
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

  const handleSaveKey = async (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return
    if (lastKeyAttempt.current === trimmed && status === "ready") return
    if (!isPlausibleTflAppKey(trimmed).ok) {
      setKeyFormatError(true)
      return
    }
    setKeyFormatError(false)
    lastKeyAttempt.current = trimmed
    const result = await save(trimmed, "local")
    if (result.ok) {
      updateDraft((current) => ({
        ...startIfNeeded(current),
        keyMode: "own",
      }))
      finishStage(4)
    }
  }

  const handleKeyDraftChange = (next: string) => {
    if (!next) {
      lastKeyAttempt.current = ""
      setKeyFormatError(false)
      setKeyDraft("")
      if (hasKey) clear()
      return
    }
    if (/^[a-zA-Z0-9]+$/.test(next)) {
      setKeyDraft(next)
      setKeyFormatError(false)
      if (isPlausibleTflAppKey(next).ok) void handleSaveKey(next)
      return
    }
    if (next.length < keyDraft.length) {
      const shortened = keyDraft.slice(0, next.length)
      setKeyDraft(shortened)
      setKeyFormatError(false)
      if (!shortened && hasKey) clear()
    }
  }

  const handleKeyPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").trim()
    if (!pasted) return
    event.preventDefault()
    setKeyDraft(pasted)
    void handleSaveKey(pasted)
  }

  const handleClearKey = () => {
    lastKeyAttempt.current = ""
    setKeyFormatError(false)
    setKeyDraft("")
    if (hasKey) clear()
  }

  const handleCopyKey = () => {
    const value = getAppKey() ?? keyDraft
    if (!value) return
    void navigator.clipboard.writeText(value).then(
      () => {
        setKeyCopied(true)
        window.setTimeout(() => setKeyCopied(false), 2000)
      },
      () => undefined
    )
  }

  const locked = hydrated && !hasKey
  const previewProfile = draft.screenProfile
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
    <div className="space-y-4 md:flex md:min-h-[calc(100dvh-var(--site-header-height)-10.5rem)] md:flex-col md:justify-center">
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      <div
        className={cn(
          "mx-auto grid w-full max-w-md items-start gap-5",
          "grid-cols-1 [grid-template-areas:'key'_'loc'_'preview'_'share']",
          "md:max-w-none md:grid-cols-[minmax(16rem,22rem)_minmax(0,max-content)]",
          "md:items-stretch md:justify-center md:gap-8 md:[grid-template-areas:none]"
        )}
      >
        <div className="contents md:col-start-1 md:row-start-1 md:flex md:flex-col md:gap-5">
          <section
            aria-labelledby="board-key-heading"
            className="[grid-area:key] space-y-2 md:[grid-area:auto]"
          >
            <h2
              id="board-key-heading"
              className="font-heading text-sm font-medium text-pretty text-foreground"
            >
              Get a free TfL API key from{" "}
              <a
                href={TFL_API_PORTAL_PRODUCT_URL}
                className="inline-flex items-center gap-1 underline underline-offset-4"
                target="_blank"
                rel="noopener noreferrer"
              >
                api-portal.tfl.gov.uk
                <ExternalLinkIcon className="size-3.5" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>{" "}
              and come back
            </h2>
            <div className="flex items-center gap-1.5">
              <InputGroup>
                <InputGroupInput
                  ref={keyInputRef}
                  id="board-tfl-key"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={displayTflAppKey(keyDraft)}
                  onChange={(event) => {
                    handleKeyDraftChange(event.target.value)
                  }}
                  onPaste={handleKeyPaste}
                  onFocus={() => setKeyFieldFocused(true)}
                  onBlur={() => {
                    setKeyFieldFocused(false)
                    window.requestAnimationFrame(scrollKeyInputToEnd)
                  }}
                  placeholder="Paste your key"
                  aria-labelledby="board-key-heading"
                  aria-invalid={keyFormatError || status === "invalid"}
                  aria-describedby="board-tfl-key-status"
                  className={cn(
                    "font-mono",
                    keyDraft && !keyFieldFocused && "text-right"
                  )}
                />
                {keyDraft ? (
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      size="icon-xs"
                      aria-label="Clear key"
                      onClick={handleClearKey}
                    >
                      <CircleXIcon />
                    </InputGroupButton>
                  </InputGroupAddon>
                ) : null}
              </InputGroup>
              {keyDraft ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  onClick={handleCopyKey}
                  aria-label={keyCopied ? "Key copied" : "Copy key"}
                >
                  {keyCopied ? <CheckIcon /> : <CopyIcon />}
                </Button>
              ) : null}
            </div>
            {keyFormatError ||
            status === "invalid" ||
            status === "validating" ||
            (status === "ready" && hasKey) ? (
              <p
                id="board-tfl-key-status"
                className={cn(
                  "text-xs",
                  keyFormatError || status === "invalid"
                    ? "text-destructive"
                    : status === "ready"
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-muted-foreground"
                )}
                role={
                  keyFormatError || status === "invalid" ? "alert" : "status"
                }
              >
                {keyFormatError || status === "invalid" ? (
                  "wrong format"
                ) : status === "validating" ? (
                  "Checking…"
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <CheckIcon className="size-3.5" aria-hidden />
                    saved
                  </span>
                )}
              </p>
            ) : null}
            {status === "ready" && hasKey ? null : (
              <button
                type="button"
                className="mx-auto mt-4 block text-center text-sm text-muted-foreground underline underline-offset-4"
                onClick={() => setKeyHelpOpen(true)}
              >
                Teach me how
              </button>
            )}
          </section>

          <LockedRegion locked={locked} className="[grid-area:loc] md:[grid-area:auto]">
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
                  <LocateIcon data-icon="inline-start" aria-hidden />
                  {locateBusy ? "Finding a stop…" : "Pick for me"}
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
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 text-sm text-muted-foreground"
                    onClick={() => {
                      setAdvancedOpen((open) => !open)
                      if (!advancedOpen) {
                        focusSearch()
                      }
                    }}
                    aria-expanded={advancedOpen}
                  >
                    <span className="underline underline-offset-4">Customise</span>
                    <ChevronDownIcon
                      data-icon="inline-end"
                      className={cn(
                        "size-4 transition-transform",
                        advancedOpen && "rotate-180"
                      )}
                      aria-hidden
                    />
                  </button>
                </div>
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
                          updateDraft((current) => {
                            const lineIds = (
                              lookupBoardStationLines(stationLines, stop) ?? []
                            ).map((line) => line.lineId)
                            return startIfNeeded({
                              ...current,
                              continueWithoutStop: false,
                              stopId: stop,
                              stopName: item?.name ?? null,
                              lineIds,
                              statusLineIds: extraStatusLineIdsForServing(lineIds),
                              busStopId: null,
                              riverStopId: null,
                              cycleDockIds: [],
                            })
                          })
                          if (stop) {
                            finishStage(2)
                            finishStage(3)
                          }
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="text-sm text-muted-foreground underline underline-offset-4 aria-pressed:text-foreground"
                      aria-pressed={draft.continueWithoutStop}
                      onClick={() => {
                        updateDraft((current) => {
                          const next = startIfNeeded({
                            ...current,
                            continueWithoutStop: !current.continueWithoutStop,
                          })
                          if (
                            !current.continueWithoutStop &&
                            current.statusLineIds.length === 0
                          ) {
                            const serving = (
                              lookupBoardStationLines(
                                stationLines,
                                current.stopId ?? undefined
                              ) ?? []
                            ).map((line) => line.lineId)
                            return {
                              ...next,
                              statusLineIds: extraStatusLineIdsForServing(serving),
                            }
                          }
                          return next
                        })
                        finishStage(2)
                      }}
                    >
                      {draft.continueWithoutStop
                        ? "Both rail and status"
                        : "Change to status only"}
                    </button>
                    {draft.continueWithoutStop ? null : (
                      <div className="space-y-4">
                        <div>
                          <h3 className="flex items-center gap-1.5 text-sm font-medium">
                            <BoardModeRoundel variant="underground" />
                            At this stop
                          </h3>
                          <BoardServingLineEditor
                            servingLines={servingLines}
                            lineGroups={lineGroups}
                            selected={draft.lineIds}
                            onChange={(lineOrder) =>
                              updateDraft((current) => ({
                                ...current,
                                lineIds: [...lineOrder],
                              }))
                            }
                          />
                        </div>
                        <div>
                          <div className="flex items-baseline justify-between gap-3">
                            <h3 className="flex items-center gap-1.5 text-sm font-medium">
                              <BoardModeRoundel variant="tfl" />
                              Also prioritise
                            </h3>
                            <button
                              type="button"
                              className="text-sm text-muted-foreground underline underline-offset-4 aria-pressed:text-foreground"
                              aria-pressed={draft.statusOnlyThese}
                              onClick={() =>
                                updateDraft((current) => ({
                                  ...current,
                                  statusOnlyThese: !current.statusOnlyThese,
                                }))
                              }
                            >
                              Only show these lines
                            </button>
                          </div>
                          <BoardExtraStatusLineEditor
                            lines={extraStatusLines}
                            selected={draft.statusLineIds}
                            onChange={(lineOrder) =>
                              updateDraft((current) => ({
                                ...current,
                                statusLineIds: [...lineOrder],
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

          <LockedRegion locked={locked} className="[grid-area:share] md:[grid-area:auto]">
            <BoardShareCard
              url={absoluteUrl}
              href={href}
              onOpen={() => completeSetup("open")}
              onCopy={() => completeSetup("copy")}
              onQrRendered={() => completeSetup("qr")}
            />
          </LockedRegion>
        </div>

        <LockedRegion
          locked={locked}
          className="[grid-area:preview] w-full min-w-0 md:col-start-2 md:row-start-1 md:min-h-full md:w-auto md:self-stretch md:[grid-area:auto]"
        >
          <div className="flex w-full flex-col items-center gap-3 md:sticky md:top-[calc(var(--site-header-height)+1rem)]">
            <BoardPreview
              href={href}
              hydrated={hydrated}
              hasKey={hasKey}
              onAddKey={openDialog}
              requireKeyOverlay={false}
              screenProfile={previewProfile}
            />
            <BoardPreviewModePills
              value={previewProfile ?? (isMobile ? "small" : "large")}
              onChange={handlePreviewMode}
            />
          </div>
        </LockedRegion>
      </div>

      {isMobile ? (
        <Sheet open={keyHelpOpen} onOpenChange={setKeyHelpOpen}>
          <SheetContent
            side="bottom"
            className="max-h-[85dvh] gap-0 overflow-y-auto"
          >
            <SheetHeader className="text-center">
              <SheetTitle className="text-center">
                How to get a key — step by step
              </SheetTitle>
              <SheetDescription className="sr-only">
                Steps from sign up to copying a key.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-5 px-4 pb-6">
              <TflApiKeyWalkthrough />
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={keyHelpOpen} onOpenChange={setKeyHelpOpen}>
          <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader className="text-center">
              <DialogTitle className="text-center">
                How to get a key — step by step
              </DialogTitle>
              <DialogDescription className="sr-only">
                Steps from sign up to copying a key.
              </DialogDescription>
            </DialogHeader>
            <TflApiKeyWalkthrough />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
