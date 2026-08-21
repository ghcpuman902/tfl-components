"use client"

import { useCallback, useEffect, useId, useState, type ReactNode } from "react"
import {
  BugIcon,
  GitPullRequestIcon,
  CircleDotIcon,
  ImagePlusIcon,
  MessageCircleIcon,
  MessageSquarePlusIcon,
  NotepadTextIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  buildBugTemplate,
  FEEDBACK_COMPONENT_OPTIONS,
  parseBugTemplate,
  suggestComponentForPage,
} from "@/lib/feedback/bug-template"
import {
  DRAFT_STORAGE_KEY,
  HONEYPOT_FIELD,
  LAST_SENT_STORAGE_KEY,
  LOADED_AT_FIELD,
  MAX_SCREENSHOT_BYTES,
  RECENT_SEND_HINT_SECONDS,
} from "@/lib/feedback/constants"
import { buildGitHubIssueUrl, buildGitHubPrUrl } from "@/lib/feedback/github"
import { isAllowedScreenshotType } from "@/lib/feedback/schema"
import { OPEN_FEEDBACK_EVENT, openFeedbackDialog } from "@/lib/feedback/open"
import { APP_VERSION_LABEL } from "@/lib/version"

/** Square attach slot — matches Send button height so the row never shifts. */
const ATTACH_SLOT = "size-11"

type Step = "form" | "done"
type FeedbackKind = "bug" | "suggestion"

type ScreenshotState = {
  blob: Blob
  previewUrl: string
} | null

const captureViewport = async (): Promise<ScreenshotState> => {
  try {
    const { domToBlob } = await import("modern-screenshot")
    const scrollX = window.scrollX
    const scrollY = window.scrollY
    const width = window.innerWidth
    const height = window.innerHeight

    const blob = await domToBlob(document.documentElement, {
      width,
      height,
      scale: Math.min(1, 1280 / Math.max(width, 1)),
      quality: 0.72,
      type: "image/jpeg",
      features: {
        restoreScrollPosition: true,
      },
      style: {
        transform: `translate(${-scrollX}px, ${-scrollY}px)`,
        overflow: "hidden",
      },
      filter: (node) => {
        if (!(node instanceof Element)) return true
        if (node.closest("[data-feedback-dialog]")) return false
        if (node.getAttribute("aria-hidden") === "true") return false
        return true
      },
    })

    if (!blob || blob.size === 0 || blob.size > MAX_SCREENSHOT_BYTES) {
      return null
    }

    return { blob, previewUrl: URL.createObjectURL(blob) }
  } catch {
    return null
  }
}

const revokePreview = (state: ScreenshotState) => {
  if (state?.previewUrl) URL.revokeObjectURL(state.previewUrl)
}

/** What we can survive a lost send / rate limit with — never the screenshot,
 * which doesn't compress small enough for localStorage. */
type FeedbackDraft = {
  kind: FeedbackKind
  freeform: boolean
  bugDescription: string
  bugSteps: string
  bugComponent: string
  bugFreeformText: string
  suggestionText: string
  email: string
  savedAt: number
}

const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

const isDraftWorthKeeping = (
  draft: Pick<
    FeedbackDraft,
    "bugDescription" | "bugSteps" | "bugFreeformText" | "suggestionText"
  >
) =>
  Boolean(
    draft.bugDescription.trim() ||
    draft.bugSteps.trim() ||
    draft.bugFreeformText.trim() ||
    draft.suggestionText.trim()
  )

const loadDraft = (): FeedbackDraft | null => {
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as FeedbackDraft
    if (Date.now() - draft.savedAt > DRAFT_MAX_AGE_MS) return null
    return isDraftWorthKeeping(draft) ? draft : null
  } catch {
    return null
  }
}

const saveDraft = (draft: Omit<FeedbackDraft, "savedAt">) => {
  try {
    if (!isDraftWorthKeeping(draft)) {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY)
      return
    }
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({ ...draft, savedAt: Date.now() })
    )
  } catch {
    // Private mode / storage full — losing the safety net beats crashing.
  }
}

const clearDraft = () => {
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY)
  } catch {
    // Ignore.
  }
}

const loadLastSentAt = (): number | null => {
  try {
    const raw = window.localStorage.getItem(LAST_SENT_STORAGE_KEY)
    if (!raw) return null
    const lastSentAt = Number(raw)
    if (!Number.isFinite(lastSentAt) || lastSentAt <= 0) return null
    return lastSentAt
  } catch {
    return null
  }
}

const saveLastSentAt = (sentAt = Date.now()) => {
  try {
    window.localStorage.setItem(LAST_SENT_STORAGE_KEY, String(sentAt))
  } catch {
    // Ignore.
  }
}

const formatSentAgo = (lastSentAt: number, nowMs = Date.now()): string => {
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - lastSentAt) / 1000))
  if (elapsedSeconds < 60) return "just now"
  const minutes = Math.floor(elapsedSeconds / 60)
  if (minutes === 1) return "1 minute ago"
  if (minutes < 60) return `${minutes} minutes ago`
  const hours = Math.floor(minutes / 60)
  if (hours === 1) return "1 hour ago"
  return `${hours} hours ago`
}

const recentSendNotice = (
  lastSentAt: number,
  nowMs = Date.now()
): string | null => {
  const ageMs = nowMs - lastSentAt
  if (ageMs < 0 || ageMs > RECENT_SEND_HINT_SECONDS * 1000) return null
  return `You sent feedback ${formatSentAgo(lastSentAt, nowMs)} — no need to send it twice unless something new came up.`
}

const FormField = ({
  label,
  htmlFor,
  optional,
  description,
  children,
}: {
  label: string
  htmlFor: string
  optional?: boolean
  description?: string
  children: ReactNode
}) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
      {label}
      {optional ? (
        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
          optional
        </span>
      ) : null}
    </label>
    {description ? (
      <p className="text-xs text-muted-foreground">{description}</p>
    ) : null}
    {children}
  </div>
)

export const FeedbackTrigger = () => (
  <button
    type="button"
    onClick={openFeedbackDialog}
    className="inline-flex h-8 w-full items-center gap-1.5 rounded-md px-2 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
    aria-haspopup="dialog"
    aria-label="Send feedback"
  >
    <MessageSquarePlusIcon className="size-3.5 shrink-0" aria-hidden />
    Feedback
  </button>
)

/** Site-wide feedback dialog. Mount once in the root layout; open with `openFeedbackDialog`. */
export const FeedbackDialog = () => {
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("form")
  const [screenshot, setScreenshot] = useState<ScreenshotState>(null)
  const [capturing, setCapturing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [kind, setKind] = useState<FeedbackKind>("bug")
  const [loadedAt, setLoadedAt] = useState(0)
  const [pageMeta, setPageMeta] = useState({ url: "", title: "" })

  const [freeform, setFreeform] = useState(false)
  const [bugDescription, setBugDescription] = useState("")
  const [bugSteps, setBugSteps] = useState("")
  const [bugComponent, setBugComponent] = useState("")
  const [bugFreeformText, setBugFreeformText] = useState("")
  const [suggestionText, setSuggestionText] = useState("")
  const [email, setEmail] = useState("")

  // Autosave a draft so a rate-limited or failed send never loses what was
  // typed. Skipped once "done", and while closed, so we don't overwrite the
  // saved draft with the fields resetState() is about to clear.
  useEffect(() => {
    if (!open || step !== "form") return
    saveDraft({
      kind,
      freeform,
      bugDescription,
      bugSteps,
      bugComponent,
      bugFreeformText,
      suggestionText,
      email,
    })
  }, [
    open,
    step,
    kind,
    freeform,
    bugDescription,
    bugSteps,
    bugComponent,
    bugFreeformText,
    suggestionText,
    email,
  ])

  const resetState = useCallback(() => {
    setStep("form")
    setKind("bug")
    setSubmitting(false)
    setCapturing(false)
    setFormError(null)
    setNotice(null)
    setLoadedAt(0)
    setPageMeta({ url: "", title: "" })
    setFreeform(false)
    setBugDescription("")
    setBugSteps("")
    setBugComponent("")
    setBugFreeformText("")
    setSuggestionText("")
    setEmail("")
    setScreenshot((prev) => {
      revokePreview(prev)
      return null
    })
  }, [])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setOpen(false)
        resetState()
        return
      }

      void (async () => {
        setCapturing(true)
        const title = document.title
        const path = window.location.pathname
        setPageMeta({
          url: window.location.href,
          title,
        })
        setBugComponent(suggestComponentForPage(path, title))
        setLoadedAt(Date.now())
        const shot = await captureViewport()
        setScreenshot(shot)
        setCapturing(false)
        setStep("form")
        setKind("bug")

        const draft = loadDraft()
        if (draft) {
          setKind(draft.kind)
          setFreeform(draft.freeform)
          setBugDescription(draft.bugDescription)
          setBugSteps(draft.bugSteps)
          if (draft.bugComponent) setBugComponent(draft.bugComponent)
          setBugFreeformText(draft.bugFreeformText)
          setSuggestionText(draft.suggestionText)
          setEmail(draft.email)
        }

        const lastSentAt = loadLastSentAt()
        const recent = lastSentAt ? recentSendNotice(lastSentAt) : null
        if (recent) {
          setNotice(recent)
        } else if (draft) {
          setNotice("Restored what you were writing last time.")
        }

        setOpen(true)
      })()
    },
    [resetState]
  )

  useEffect(() => {
    const handleOpenFeedback = () => {
      handleOpenChange(true)
    }
    window.addEventListener(OPEN_FEEDBACK_EVENT, handleOpenFeedback)
    return () => {
      window.removeEventListener(OPEN_FEEDBACK_EVENT, handleOpenFeedback)
    }
  }, [handleOpenChange])

  const handleRemoveScreenshot = () => {
    setScreenshot((prev) => {
      revokePreview(prev)
      return null
    })
  }

  const handleAttachImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    if (
      !isAllowedScreenshotType(file.type) ||
      file.size > MAX_SCREENSHOT_BYTES
    ) {
      toast.error("Use a JPEG, PNG, or WebP under 1.5MB.")
      return
    }

    setScreenshot((prev) => {
      revokePreview(prev)
      return { blob: file, previewUrl: URL.createObjectURL(file) }
    })
  }

  const handleKindChange = (value: string | number | null) => {
    if (value !== "bug" && value !== "suggestion") return
    setKind(value)
    setFormError(null)
  }

  const handleToggleFreeform = (checked: boolean) => {
    if (checked) {
      setBugFreeformText(
        buildBugTemplate(bugDescription, bugSteps, bugComponent)
      )
    } else {
      const parsed = parseBugTemplate(bugFreeformText)
      setBugDescription(parsed.description)
      setBugSteps(parsed.steps)
      if (parsed.component) {
        setBugComponent(parsed.component)
      }
    }
    setFreeform(checked)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    const message =
      kind === "bug"
        ? freeform
          ? bugFreeformText.trim()
          : buildBugTemplate(bugDescription, bugSteps, bugComponent).trim()
        : suggestionText.trim()

    const requiredMissing =
      kind === "bug"
        ? freeform
          ? !bugFreeformText.trim()
          : !bugDescription.trim()
        : !suggestionText.trim()

    if (requiredMissing) {
      setFormError(
        kind === "bug"
          ? "Tell us what happened."
          : "Let us know what's on your mind."
      )
      return
    }
    setFormError(null)
    setNotice(null)

    const data = new FormData()
    data.set("kind", kind)
    data.set("message", message)
    data.set("email", email)
    data.set("pageUrl", pageMeta.url || window.location.href)
    data.set("pageTitle", pageMeta.title || document.title)
    data.set("appVersion", APP_VERSION_LABEL)
    data.set(LOADED_AT_FIELD, String(loadedAt || Date.now()))
    data.set(HONEYPOT_FIELD, "")

    if (screenshot) {
      data.set(
        "screenshot",
        new File([screenshot.blob], "feedback-screenshot.jpg", {
          type: screenshot.blob.type || "image/jpeg",
        })
      )
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        body: data,
      })
      const result = (await response.json().catch(() => null)) as {
        ok?: boolean
        error?: string
        soft?: boolean
      } | null

      if (!response.ok || !result?.ok) {
        toast.error(result?.error ?? "Could not send feedback.")
        setSubmitting(false)
        return
      }

      // Bot/spam soft-fails still look like success (no tip-off). Only a real
      // send clears the draft and stamps "last sent" for the soft hint.
      if (!result.soft) {
        clearDraft()
        saveLastSentAt()
      }
      setStep("done")
      toast.success("Thanks — feedback sent.")
    } catch {
      toast.error("Could not send feedback. Check your connection.")
    } finally {
      setSubmitting(false)
    }
  }

  const issueUrl = buildGitHubIssueUrl({
    pageUrl: pageMeta.url,
    pageTitle: pageMeta.title,
  })
  const prUrl = buildGitHubPrUrl()

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        data-feedback-dialog=""
        showCloseButton={false}
        className="max-h-[min(90svh,42rem)] scrollbar-gutter-stable gap-0 overflow-y-auto p-0 sm:max-w-md"
        aria-labelledby={titleId}
      >
        <DialogClose
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-2 right-2 z-10"
              aria-label="Close feedback"
            />
          }
        >
          <XIcon />
          <span className="sr-only">Close</span>
        </DialogClose>

        <div className="flex flex-col gap-4 p-4 pr-[calc(1rem-4px)]">
          <DialogHeader className="gap-1.5 pr-8">
            <DialogTitle id={titleId}>Feedback</DialogTitle>
            {step === "done" ? (
              <DialogDescription>
                Got it. Thanks for helping improve TfL Components.
              </DialogDescription>
            ) : (
              <DialogDescription className="sr-only">
                Send private feedback or open a GitHub issue or pull request.
              </DialogDescription>
            )}
          </DialogHeader>

          {capturing ? (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Capturing the page…
            </p>
          ) : null}

          {step === "form" ? (
            <>
              <p className="text-sm text-muted-foreground">
                Hello! If you are comfortable with GitHub, you can{" "}
                <a
                  href={issueUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline font-medium text-foreground underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <CircleDotIcon
                    className="mr-1 inline size-3.5 -translate-y-[0.1lh] align-text-bottom"
                    aria-hidden
                  />
                  open an issue
                </a>{" "}
                or{" "}
                <a
                  href={prUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline font-medium text-foreground underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <GitPullRequestIcon
                    className="mr-1 inline size-3.5 -translate-y-[0.1lh] align-text-bottom"
                    aria-hidden
                  />
                  submit a PR
                </a>
                . Otherwise:
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <Tabs
                  value={kind}
                  onValueChange={handleKindChange}
                  className="gap-3"
                >
                  <TabsList className="grid h-9 w-full grid-cols-2">
                    <TabsTrigger value="bug" className="gap-1.5">
                      <BugIcon className="size-3.5" aria-hidden />
                      Report a bug
                    </TabsTrigger>
                    <TabsTrigger value="suggestion" className="gap-1.5">
                      <MessageCircleIcon className="size-3.5" aria-hidden />
                      Say hi
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="bug" className="mt-0 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <NotepadTextIcon
                          className="size-3.5 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <span className="text-xs text-muted-foreground">
                          Paste as one note instead
                        </span>
                      </div>
                      <Switch
                        size="sm"
                        checked={freeform}
                        onCheckedChange={handleToggleFreeform}
                        aria-label="Switch to plain text mode"
                      />
                    </div>

                    {freeform ? (
                      <FormField
                        label="Bug report"
                        htmlFor="feedback-bug-freeform"
                      >
                        <Textarea
                          id="feedback-bug-freeform"
                          rows={8}
                          value={bugFreeformText}
                          onChange={(event) =>
                            setBugFreeformText(event.target.value)
                          }
                          maxLength={4000}
                        />
                      </FormField>
                    ) : (
                      <>
                        <FormField
                          label="What happened, and what did you expect instead?"
                          htmlFor="feedback-bug-description"
                        >
                          <Textarea
                            id="feedback-bug-description"
                            rows={3}
                            placeholder="e.g. the arrivals board clips on narrow screens; I expected it to wrap."
                            value={bugDescription}
                            onChange={(event) =>
                              setBugDescription(event.target.value)
                            }
                            maxLength={2000}
                          />
                        </FormField>

                        <FormField
                          label="Steps to reproduce"
                          htmlFor="feedback-bug-steps"
                          optional
                        >
                          <Textarea
                            id="feedback-bug-steps"
                            rows={3}
                            placeholder={
                              "1. Go to ...\n2. Click ...\n3. See ..."
                            }
                            value={bugSteps}
                            onChange={(event) =>
                              setBugSteps(event.target.value)
                            }
                            maxLength={2000}
                          />
                        </FormField>

                        <FormField
                          label="Component or page"
                          htmlFor="feedback-bug-component"
                          optional
                        >
                          <Combobox
                            items={[...FEEDBACK_COMPONENT_OPTIONS]}
                            inputValue={bugComponent}
                            onInputValueChange={(value) => {
                              setBugComponent(String(value).slice(0, 200))
                            }}
                            onValueChange={(value) => {
                              if (typeof value === "string") {
                                setBugComponent(value.slice(0, 200))
                              }
                            }}
                            openOnInputClick
                            modal={false}
                          >
                            <ComboboxInput
                              id="feedback-bug-component"
                              placeholder="Start typing or pick a page…"
                              className="w-full"
                              showClear={bugComponent.length > 0}
                            />
                            <ComboboxContent className="z-[200]">
                              <ComboboxEmpty>
                                No match — keep your text
                              </ComboboxEmpty>
                              <ComboboxList>
                                {(item) => (
                                  <ComboboxItem key={item} value={item}>
                                    {item}
                                  </ComboboxItem>
                                )}
                              </ComboboxList>
                            </ComboboxContent>
                          </Combobox>
                        </FormField>
                      </>
                    )}
                  </TabsContent>

                  <TabsContent
                    value="suggestion"
                    className="mt-0 flex flex-col gap-3"
                  >
                    <FormField
                      label="What's on your mind?"
                      htmlFor="feedback-suggestion"
                    >
                      <Textarea
                        id="feedback-suggestion"
                        rows={10}
                        className="min-h-40"
                        placeholder="What worked well, what was frustrating, or the one change that would help most."
                        value={suggestionText}
                        onChange={(event) =>
                          setSuggestionText(event.target.value)
                        }
                        maxLength={4000}
                      />
                    </FormField>
                  </TabsContent>
                </Tabs>

                <FormField
                  label="Can we follow up?"
                  htmlFor="feedback-email"
                  optional
                  description="Only used if we need to ask about this."
                >
                  <Input
                    id="feedback-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    maxLength={254}
                  />
                </FormField>

                {notice ? (
                  <p
                    className="text-sm text-muted-foreground"
                    role="status"
                    aria-live="polite"
                  >
                    {notice}
                  </p>
                ) : null}

                {formError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {formError}
                  </p>
                ) : null}

                <div
                  aria-hidden
                  className="pointer-events-none absolute left-[-9999px] h-0 w-0 overflow-hidden opacity-0"
                >
                  <label>
                    Company website
                    <input
                      type="text"
                      name={HONEYPOT_FIELD}
                      tabIndex={-1}
                      autoComplete="off"
                      defaultValue=""
                    />
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`relative ${ATTACH_SLOT} shrink-0`}>
                    {screenshot ? (
                      <>
                        <div className="overflow-hidden rounded-md border border-border bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element -- blob preview */}
                          <img
                            src={screenshot.previewUrl}
                            alt="Screenshot attached to this feedback"
                            className={`block ${ATTACH_SLOT} object-cover object-top`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveScreenshot}
                          aria-label="Remove screenshot"
                          className="absolute -top-1.5 -right-1.5 inline-flex size-5 items-center justify-center rounded-full bg-muted text-muted-foreground shadow-sm ring-1 ring-border hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <XIcon className="size-3" aria-hidden />
                        </button>
                      </>
                    ) : (
                      <label
                        className={`flex ${ATTACH_SLOT} cursor-pointer items-center justify-center rounded-md border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:outline-none hover:border-foreground/30 hover:bg-muted hover:text-foreground`}
                      >
                        <ImagePlusIcon className="size-4" aria-hidden />
                        <span className="sr-only">Attach image</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          onChange={handleAttachImage}
                        />
                      </label>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="min-h-11 min-w-0 flex-1"
                  >
                    {submitting ? "Sending…" : "Send feedback"}
                  </Button>
                </div>
              </form>
            </>
          ) : null}

          {step === "done" ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                Your note is in my inbox
                {screenshot ? ", with the page screenshot" : ""}.
              </p>
              <DialogClose
                render={<Button variant="outline" className="min-h-11" />}
              >
                Close
              </DialogClose>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
