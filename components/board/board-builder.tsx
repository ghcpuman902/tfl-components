"use client"

import {
  useMemo,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
} from "react"
import { ChevronDownIcon } from "lucide-react"
import Link from "next/link"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUserTflCredentials } from "@/components/user-tfl-credentials-provider"
import { useHorizontalScrollEnd } from "@/hooks/use-horizontal-scroll-end"
import { buildBoardHref } from "@/lib/tfl/board-url-state"
import { HOME_RAIL_STOP } from "@/lib/tfl/home-arrivals-stops"
import { cn } from "@/lib/utils"

type BoardPreset = {
  id: "station" | "mixed" | "lines" | "commute"
  title: string
  description: string
  available: boolean
}

const BOARD_PRESETS: readonly BoardPreset[] = [
  {
    id: "station",
    title: "Station + network status",
    description:
      "One station's arrivals, the current time, and status for every Tube and rail line.",
    available: true,
  },
  {
    id: "mixed",
    title: "Mixed transport",
    description: "Combine Tube, rail, bus, DLR, and Overground in one board.",
    available: false,
  },
  {
    id: "lines",
    title: "My lines",
    description: "Show status for the lines you choose and leave out the rest.",
    available: false,
  },
  {
    id: "commute",
    title: "Commute",
    description: "Build the board around a regular journey or destination.",
    available: false,
  },
]

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

const PresetDiagram = ({ preset }: { preset: BoardPreset["id"] }) => {
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

  if (preset === "mixed") {
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

  if (preset === "lines") {
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

  return (
    <div className="grid h-24 grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg bg-foreground p-2.5">
      <div className="grid h-14 place-items-center rounded bg-background/20 p-1.5">
        <span className="h-2 w-4/5 rounded-sm bg-background/80" />
        <span className="h-2 w-1/2 rounded-sm bg-background/45" />
      </div>
      <div className="flex items-center">
        <span className="size-2 rounded-full bg-background" />
        <span className="h-0.5 w-4 bg-background/60" />
        <span className="size-2 rounded-full bg-background" />
      </div>
      <div className="grid h-14 place-items-center rounded bg-background/35 p-1.5">
        <span className="h-2 w-3/4 rounded-sm bg-background/75" />
        <span className="h-2 w-1/2 rounded-sm bg-background/50" />
      </div>
    </div>
  )
}

const PRESET_FEEDBACK_MOTION =
  "duration-300 ease-[cubic-bezier(0.05,0,0,1)]"
const PRESET_COLOR_MOTION =
  "duration-200 ease-[cubic-bezier(0.05,0,0,1)]"

const PresetCardFeedback = () => (
  <>
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-0 rounded-2xl bg-foreground/13 opacity-0 transition-opacity",
        PRESET_FEEDBACK_MOTION,
        "group-hover/preset:opacity-100 group-focus-within/preset:opacity-100"
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

const PresetCard = ({ preset }: { preset: BoardPreset }) => (
  <li
    className="group/preset relative isolate z-0 shrink-0 snap-start px-1.5 py-3 first:pl-3 last:pr-3 hover:z-10 focus-within:z-10"
    aria-current={preset.available ? "true" : undefined}
  >
    <PresetCardFeedback />
    <Card
      className={cn(
        "relative z-10 h-full w-[82vw] max-w-84 gap-3 py-3 sm:w-80",
        preset.available
          ? "ring-2 ring-primary"
          : "bg-muted/30 text-muted-foreground"
      )}
    >
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
            "group-hover/preset:text-foreground group-focus-within/preset:text-foreground"
          )}
        >
          {preset.description}
        </CardDescription>
        <CardAction>
          <Badge variant={preset.available ? "default" : "secondary"}>
            {preset.available ? "Current" : "Coming soon"}
          </Badge>
        </CardAction>
      </CardHeader>
    </Card>
  </li>
)

export const BoardBuilder = () => {
  const {
    status,
    hydrated,
    appKeyMasked,
    persistMode,
    error,
    getAppKey,
    openDialog,
  } = useUserTflCredentials()
  const { scrollRef, showEndFade } = useHorizontalScrollEnd<HTMLUListElement>()

  const [stop, setStop] = useState<string>(HOME_RAIL_STOP.id)
  const [stopName, setStopName] = useState<string>(HOME_RAIL_STOP.name)
  const [configOpen, setConfigOpen] = useState(false)
  const origin = useSyncExternalStore(
    subscribeToOrigin,
    getBrowserOrigin,
    getServerOrigin
  )

  const appKey = hydrated ? (getAppKey() ?? "") : ""
  const hasKey = Boolean(appKey)

  const href = useMemo(
    () =>
      buildBoardHref({
        stop: stop.trim() || undefined,
        stopName: stopName.trim() || undefined,
        key: appKey.trim() || undefined,
      }),
    [stop, stopName, appKey]
  )

  const absoluteUrl = origin ? `${origin}${href}` : href

  const handleStopChange = (event: ChangeEvent<HTMLInputElement>) => {
    setStop(event.target.value)
  }

  const handleStopNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setStopName(event.target.value)
  }

  const handleManageKey = () => {
    openDialog()
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3" aria-labelledby="board-layouts-heading">
        <h2 id="board-layouts-heading" className="text-lg font-semibold">
          Layouts
        </h2>
        <div className="relative">
          <ul
            ref={scrollRef}
            className="flex snap-x snap-mandatory scrollbar-none overflow-x-auto overscroll-x-contain"
            aria-label="Board layouts"
            tabIndex={0}
          >
            {BOARD_PRESETS.map((preset) => (
              <PresetCard key={preset.id} preset={preset} />
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
      </section>

      <section className="space-y-3" aria-labelledby="board-preview-heading">
        <h2 id="board-preview-heading" className="text-lg font-semibold">
          Preview
        </h2>
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
      </section>

      <section className="space-y-3" aria-labelledby="board-launch-heading">
        <h2 id="board-launch-heading" className="text-lg font-semibold">
          Launch
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs break-all text-foreground">
            {absoluteUrl}
          </code>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              data-copy-text={absoluteUrl}
              aria-label="Copy board URL"
            >
              Copy URL
            </Button>
            <Button
              nativeButton={false}
              render={<a href={href} target="_blank" rel="noreferrer" />}
            >
              Open board
            </Button>
          </div>
        </div>
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
            Board loads live TfL data in this browser, and your key is not sent
            to our server.
          </p>
        </div>
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
          <form
            className="grid max-w-xl gap-5 p-4"
            onSubmit={(event) => event.preventDefault()}
          >
            <div className="space-y-2">
              <Label htmlFor="board-stop">Stop ID</Label>
              <Input
                id="board-stop"
                name="stop"
                value={stop}
                onChange={handleStopChange}
                autoComplete="off"
                spellCheck={false}
                aria-describedby="board-stop-hint"
              />
              <p id="board-stop-hint" className="text-sm text-muted-foreground">
                Station NaPTAN ID. Find it in{" "}
                <Link
                  href="/docs/explorer"
                  className="text-foreground underline underline-offset-4"
                >
                  Explorer
                </Link>
                .
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="board-stop-name">Stop name (optional)</Label>
              <Input
                id="board-stop-name"
                name="stopName"
                value={stopName}
                onChange={handleStopNameChange}
                autoComplete="off"
              />
            </div>

            <fieldset className="space-y-3" disabled>
              <legend className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span>Display options</span>
                <Badge variant="secondary">Coming soon</Badge>
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="board-mode">Interactivity</Label>
                  <select
                    id="board-mode"
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm opacity-60"
                    defaultValue="static"
                  >
                    <option value="static">Non-interactive</option>
                    <option value="mouse">Mouse</option>
                    <option value="touch">Touch</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="board-fit">Fit</Label>
                  <select
                    id="board-fit"
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm opacity-60"
                    defaultValue="static"
                  >
                    <option value="static">Natural size</option>
                    <option value="fill">Fill the screen</option>
                  </select>
                </div>
              </div>
            </fieldset>
          </form>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
