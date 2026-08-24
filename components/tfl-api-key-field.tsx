"use client"

import {
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
} from "react"
import { CheckIcon, CircleXIcon, CopyIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { useUserTflCredentials } from "@/components/user-tfl-credentials-provider"
import {
  displayTflAppKey,
  isPlausibleTflAppKey,
} from "@/lib/tfl/user-credentials-storage"
import { TEXT_LINK_CLASS } from "@/lib/text-link"
import { cn } from "@/lib/utils"

type TflApiKeyHelpLinkProps = {
  className?: string
}

export const TflApiKeyHelpLink = ({ className }: TflApiKeyHelpLinkProps) => {
  const { openWalkthrough } = useUserTflCredentials()
  const handleOpenHelp = () => {
    openWalkthrough()
  }

  return (
    <button
      type="button"
      className={cn(
        TEXT_LINK_CLASS,
        "text-sm text-muted-foreground",
        className
      )}
      onClick={handleOpenHelp}
    >
      Teach me how
    </button>
  )
}

type TflApiKeyFieldProps = {
  id: string
  labelledBy?: string
  seedKey?: string
  onSaved?: () => void
  centerHelp?: boolean
  showHelp?: boolean
  className?: string
}

export const TflApiKeyField = ({
  id,
  labelledBy,
  seedKey,
  onSaved,
  centerHelp = false,
  showHelp: showHelpProp = true,
  className,
}: TflApiKeyFieldProps) => {
  const {
    hydrated,
    persistMode,
    getAppKey,
    save,
    clear,
    status,
  } = useUserTflCredentials()
  const [editDraft, setEditDraft] = useState<string | null>(null)
  const [keyCopied, setKeyCopied] = useState(false)
  const [keyFormatError, setKeyFormatError] = useState(false)
  const [keyFieldFocused, setKeyFieldFocused] = useState(false)
  const lastKeyAttempt = useRef("")
  const keyInputRef = useRef<HTMLInputElement | null>(null)

  const storedKey = hydrated ? (getAppKey() ?? "") : ""
  const keyDraft =
    editDraft !== null ? editDraft : storedKey || seedKey?.trim() || ""
  const hasKey = Boolean(storedKey)
  const statusId = `${id}-status`
  const showStatus =
    keyFormatError ||
    status === "invalid" ||
    status === "validating" ||
    (status === "ready" && hasKey)
  const showHelp = showHelpProp && !(status === "ready" && hasKey)

  const scrollKeyInputToEnd = () => {
    const input = keyInputRef.current
    if (!input) return
    input.scrollLeft = input.scrollWidth
  }

  useLayoutEffect(() => {
    if (!keyDraft || keyFieldFocused) return
    scrollKeyInputToEnd()
  }, [keyDraft, keyFieldFocused])

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
    const result = await save(trimmed, persistMode)
    if (result.ok) {
      setEditDraft(null)
      onSaved?.()
    }
  }

  const handleKeyDraftChange = (next: string) => {
    if (!next) {
      lastKeyAttempt.current = ""
      setKeyFormatError(false)
      setEditDraft("")
      if (hasKey) clear()
      return
    }
    if (/^[a-zA-Z0-9]+$/.test(next)) {
      setEditDraft(next)
      setKeyFormatError(false)
      if (isPlausibleTflAppKey(next).ok) void handleSaveKey(next)
      return
    }
    if (next.length < keyDraft.length) {
      const shortened = keyDraft.slice(0, next.length)
      setEditDraft(shortened)
      setKeyFormatError(false)
      if (!shortened && hasKey) clear()
    }
  }

  const handleKeyPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").trim()
    if (!pasted) return
    event.preventDefault()
    setEditDraft(pasted)
    void handleSaveKey(pasted)
  }

  const handleClearKey = () => {
    lastKeyAttempt.current = ""
    setKeyFormatError(false)
    setEditDraft("")
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

  const handleFocus = () => {
    setKeyFieldFocused(true)
    if (editDraft === null) {
      setEditDraft(storedKey || seedKey?.trim() || "")
    }
  }

  const handleBlur = () => {
    setKeyFieldFocused(false)
    if (storedKey) setEditDraft(null)
    window.requestAnimationFrame(scrollKeyInputToEnd)
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5">
        <InputGroup>
          <InputGroupInput
            ref={keyInputRef}
            id={id}
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            value={displayTflAppKey(keyDraft)}
            onChange={(event) => {
              handleKeyDraftChange(event.target.value)
            }}
            onPaste={handleKeyPaste}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Paste your key"
            aria-label={labelledBy ? undefined : "TfL API key"}
            aria-labelledby={labelledBy}
            aria-invalid={keyFormatError || status === "invalid"}
            aria-describedby={showStatus ? statusId : undefined}
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
      {showStatus ? (
        <p
          id={statusId}
          className={cn(
            "text-xs",
            keyFormatError || status === "invalid"
              ? "text-destructive"
              : status === "ready"
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-muted-foreground"
          )}
          role={keyFormatError || status === "invalid" ? "alert" : "status"}
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
      {showHelp ? (
        <TflApiKeyHelpLink
          className={centerHelp ? "mx-auto mt-4 block text-center" : undefined}
        />
      ) : null}
    </div>
  )
}
