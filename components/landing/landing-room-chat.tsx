"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { HeaderRoundel } from "@/components/site-header-roundel"
import { useLondonGreeting } from "@/hooks/use-london-greeting"
import { cn } from "@/lib/utils"

const TFL_TS_URL = "https://www.npmjs.com/package/tfl-ts"

type ChatLine = {
  id: string
  content: ReactNode
}

type LandingRoomChatProps = {
  active: boolean
  skipIntro?: boolean
  onBoardClick?: () => void
  onStoryComplete?: () => void
  onRestart?: () => void
}

const mentionIconClassName = "mr-1 inline-block size-[1em] align-[-0.15em]"

const NpmMark = () => (
  <svg
    viewBox="0 0 256 256"
    className={mentionIconClassName}
    aria-hidden
  >
    <path fill="#C12127" d="M0 256V0h256v256z" />
    <path fill="#fff" d="M48 48h160v160h-32V80h-48v128H48z" />
  </svg>
)

const mentionClassName =
  "pointer-events-auto inline-flex items-center whitespace-nowrap underline underline-offset-4 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"

const IntroBeat = ({ greeting }: { greeting: string }) => (
  <>
    {greeting} from London. I made{" "}
    <a
      href={TFL_TS_URL}
      target="_blank"
      rel="noreferrer"
      className={mentionClassName}
    >
      <NpmMark />
      tfl-ts
    </a>{" "}
    because the TfL API is a pain to talk to. Then I made{" "}
    <Link href="/docs" className={mentionClassName}>
      <HeaderRoundel className={mentionIconClassName} />
      tfl-components
    </Link>{" "}
    to render it as boards, maps, and line diagrams.
  </>
)

const BoardBeat = ({ onBoardClick }: { onBoardClick?: () => void }) => (
  <>
    Combining those, I made{" "}
    <Link href="/board" onClick={onBoardClick} className={mentionClassName}>
      Board
    </Link>
    . It&apos;s a live TfL board that runs on an old iPad, a kitchen tablet, or any screen you&apos;ve already got.
  </>
)

const assistantBeats = (
  greeting: string,
  onBoardClick?: () => void
): ChatLine[] => [
  { id: "intro", content: <IntroBeat greeting={greeting} /> },
  { id: "board", content: <BoardBeat onBoardClick={onBoardClick} /> },
  {
    id: "nearby",
    content:
      "It uses your location for the nearest station and the line status. You can add buses, cycle hire, or a river pier. If that's still not enough, use the components to build your own.",
  },
]

const END_CHOICES = [
  { id: "board", href: "/board", label: "Make my own board" },
  { id: "components", href: "/docs/components", label: "Browse components" },
] as const

const MESSAGE_STACK_CLASS =
  "flex h-[min(18lh,50%)] w-full flex-col items-start justify-end gap-1 text-[clamp(0.9375rem,0.85rem+0.3vw,1rem)] leading-snug md:h-auto"

const BUBBLE_CLASS =
  "max-w-[92%] bg-background/85 px-3.5 py-2.5 leading-snug text-pretty text-foreground"

const ENTER_EASE = "ease-[cubic-bezier(0.19,1,0.22,1)]"

const ENTER_CLASS = cn(
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2",
  "motion-reduce:animate-in motion-reduce:fade-in",
  "duration-300 fill-mode-both",
  ENTER_EASE
)

const CHOICE_ENTER_CLASS = cn(
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:slide-in-from-right-2",
  "motion-reduce:animate-in motion-reduce:fade-in",
  "duration-300 fill-mode-both",
  ENTER_EASE
)

const RADIUS_TRANSITION_CLASS =
  "transition-[border-radius] duration-300 ease-[cubic-bezier(0.19,1,0.22,1)]"

const CHOICE_PILL_CLASS =
  "pointer-events-auto inline-flex min-h-11 origin-bottom-right cursor-pointer items-center bg-foreground px-4 py-2.5 text-[clamp(0.9375rem,0.85rem+0.3vw,1rem)] font-medium text-background shadow-[0_3px_0_0_color-mix(in_oklch,var(--foreground)_28%,transparent)] select-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none motion-safe:transition-[border-radius,transform] motion-safe:duration-150 motion-safe:ease-[cubic-bezier(0.25,0.46,0.45,0.94)] motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.97] motion-safe:active:translate-y-px"

const RESTART_CLASS =
  "pointer-events-auto self-end text-[clamp(0.8125rem,0.75rem+0.2vw,0.875rem)] text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"

const COMPOSE_MS = 2100
const ASSISTANT_GAP_MS = 3400
const CHOICE_GAP_MS = 900

const STORY_MS = [
  COMPOSE_MS,
  ASSISTANT_GAP_MS,
  ASSISTANT_GAP_MS,
  CHOICE_GAP_MS,
  CHOICE_GAP_MS,
] as const

const TypingDots = () => (
  <div className="flex items-center gap-1" aria-label="Typing">
    {[0, 1, 2].map((index) => (
      <span
        key={index}
        className="landing-chat-dot size-1.5 rounded-full bg-foreground/40"
        style={{ animationDelay: `${index * 160}ms` }}
      />
    ))}
  </div>
)

const ChoiceBubble = ({
  href,
  onClick,
  isLatest,
  skipEnter,
  children,
}: {
  href: string
  onClick?: () => void
  isLatest: boolean
  skipEnter: boolean
  children: ReactNode
}) => (
  <Link
    href={href}
    onClick={onClick}
    className={cn("block self-end", skipEnter ? undefined : CHOICE_ENTER_CLASS)}
  >
    <span
      className={cn(
        CHOICE_PILL_CLASS,
        RADIUS_TRANSITION_CLASS,
        isLatest ? "rounded-[26px_26px_3px_26px]" : "rounded-[26px]"
      )}
    >
      {children}
    </span>
  </Link>
)

export const LandingRoomChat = ({
  active,
  skipIntro = false,
  onBoardClick,
  onStoryComplete,
  onRestart,
}: LandingRoomChatProps) => {
  const greeting = useLondonGreeting()
  const beats = assistantBeats(greeting, onBoardClick)
  const [shownCount, setShownCount] = useState(skipIntro ? beats.length : 0)
  const [choiceCount, setChoiceCount] = useState(
    skipIntro ? END_CHOICES.length : 0
  )
  const completedRef = useRef(skipIntro)

  useEffect(() => {
    if (active) return
    completedRef.current = false
    setShownCount(0)
    setChoiceCount(0)
  }, [active])

  useEffect(() => {
    if (!skipIntro) return
    completedRef.current = true
    setShownCount(beats.length)
    setChoiceCount(END_CHOICES.length)
  }, [beats.length, skipIntro])

  useEffect(() => {
    if (!active || skipIntro) return

    let timeout = 0

    if (shownCount < beats.length) {
      timeout = window.setTimeout(() => {
        setShownCount((current) => current + 1)
      }, STORY_MS[shownCount])
    } else if (choiceCount < END_CHOICES.length) {
      timeout = window.setTimeout(() => {
        setChoiceCount((current) => current + 1)
      }, STORY_MS[beats.length + choiceCount])
    }

    return () => window.clearTimeout(timeout)
  }, [active, beats.length, choiceCount, shownCount, skipIntro])

  useEffect(() => {
    if (!active || skipIntro) return
    if (shownCount < beats.length) return
    if (choiceCount < END_CHOICES.length) return
    if (completedRef.current) return
    completedRef.current = true
    onStoryComplete?.()
  }, [active, beats.length, choiceCount, onStoryComplete, shownCount, skipIntro])

  if (!active) return null

  const typing = shownCount === 0
  const followUps = beats.slice(1, shownCount)
  const visibleChoices = END_CHOICES.slice(0, choiceCount)
  const storyDone =
    shownCount >= beats.length && choiceCount >= END_CHOICES.length

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-20",
        "inset-4",
        "md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-sm md:translate-x-[-116.666%] md:-translate-y-1/2"
      )}
    >
      <div
        aria-label="Get started"
        aria-live="polite"
        className="flex h-full flex-col justify-between gap-2.5 md:h-auto"
      >
        <div className={MESSAGE_STACK_CLASS}>
          <div
            className={cn(
              BUBBLE_CLASS,
              RADIUS_TRANSITION_CLASS,
              shownCount <= 1
                ? "rounded-[26px_26px_26px_3px]"
                : "rounded-[26px]",
              skipIntro ? undefined : ENTER_CLASS
            )}
          >
            {typing ? (
              <TypingDots />
            ) : (
              <div className={skipIntro ? undefined : ENTER_CLASS}>
                {beats[0].content}
              </div>
            )}
          </div>
          {followUps.map((line, index) => {
            const isLatest = index === followUps.length - 1 && shownCount > 1
            return (
              <div
                key={line.id}
                className={cn(
                  BUBBLE_CLASS,
                  RADIUS_TRANSITION_CLASS,
                  skipIntro ? undefined : ENTER_CLASS,
                  isLatest
                    ? "rounded-[26px_26px_26px_3px]"
                    : "rounded-[26px]"
                )}
              >
                {line.content}
              </div>
            )
          })}
        </div>
        {visibleChoices.length > 0 || (storyDone && onRestart) ? (
          <div className="flex flex-col items-end gap-1">
            {visibleChoices.map((choice, index) => (
              <ChoiceBubble
                key={choice.id}
                href={choice.href}
                onClick={choice.href === "/board" ? onBoardClick : undefined}
                isLatest={index === visibleChoices.length - 1}
                skipEnter={skipIntro}
              >
                {choice.label}
              </ChoiceBubble>
            ))}
            {storyDone && onRestart ? (
              <button
                type="button"
                onClick={onRestart}
                className={cn(RESTART_CLASS, skipIntro ? undefined : ENTER_CLASS)}
              >
                Start over
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
