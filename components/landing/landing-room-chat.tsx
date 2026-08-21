"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { HeaderRoundel } from "@/components/site-header-roundel"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { cn } from "@/lib/utils"

const TYPING_MS = 2000
const TFL_TS_URL = "https://www.npmjs.com/package/tfl-ts"
const BUBBLE_ROUND = 26
const BUBBLE_TAIL = 3

type ChatLine = {
  id: string
  chars: number
  content: ReactNode
}

type LandingRoomChatProps = {
  active: boolean
  onBoardClick?: () => void
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
  "pointer-events-auto underline underline-offset-4 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"

const IntroBeat = () => (
  <>
    Hi from London. I made{" "}
    <a
      href={TFL_TS_URL}
      target="_blank"
      rel="noreferrer"
      className={mentionClassName}
    >
      <NpmMark />
      tfl-ts
    </a>{" "}
    because the TfL API is a pain to talk to.{" "}
    <Link href="/docs" className={mentionClassName}>
      <HeaderRoundel className={mentionIconClassName} />
      tfl-components
    </Link>{" "}
    is how you put that on a board.
  </>
)

const BEATS: ChatLine[] = [
  { id: "intro", chars: 168, content: <IntroBeat /> },
  {
    id: "board",
    chars: 108,
    content:
      "The iPad is running Board, the fastest way to get a live TfL board on a screen you already have.",
  },
  {
    id: "nearby",
    chars: 124,
    content:
      "It uses your location for the nearest station and the line status. Add buses, cycle hire, or a river pier if you want them.",
  },
]

const END_CHOICES = [
  { id: "board", href: "/board", label: "Make my own board" },
  { id: "components", href: "/docs/components", label: "See all components" },
] as const

const layoutSpring = { type: "spring" as const, duration: 0.55, bounce: 0.08 }
const followSpring = { type: "spring" as const, duration: 0.34, bounce: 0.04 }
const radiusSpring = { type: "spring" as const, duration: 0.42, bounce: 0.06 }
const pressSpring = { type: "spring" as const, duration: 0.32, bounce: 0.28 }

const jitter = (min: number, span: number) => min + Math.random() * span

const delayAfterMessageMs = (chars: number) =>
  Math.round(150 + chars * 1.6 + jitter(40, 110))

const assistantRadius = (isLatest: boolean) =>
  isLatest
    ? `${BUBBLE_ROUND}px ${BUBBLE_ROUND}px ${BUBBLE_ROUND}px ${BUBBLE_TAIL}px`
    : `${BUBBLE_ROUND}px`

const choiceRadius = (isLatest: boolean) =>
  isLatest
    ? `${BUBBLE_ROUND}px ${BUBBLE_ROUND}px ${BUBBLE_TAIL}px ${BUBBLE_ROUND}px`
    : `${BUBBLE_ROUND}px`

const choiceClassName =
  "pointer-events-auto inline-flex min-h-11 cursor-pointer items-center bg-foreground px-4 py-2.5 text-[clamp(0.9375rem,0.85rem+0.3vw,1rem)] font-medium text-background shadow-[0_3px_0_0_color-mix(in_oklch,var(--foreground)_28%,transparent)] select-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"

const TypingDots = ({ reducedMotion }: { reducedMotion: boolean }) => (
  <div className="flex items-center gap-1" aria-label="Typing">
    {[0, 1, 2].map((index) => (
      <motion.span
        key={index}
        className="size-1.5 rounded-full bg-foreground/40"
        animate={
          reducedMotion
            ? { opacity: 0.55 }
            : { opacity: [0.25, 1, 0.25], y: [0, -3, 0] }
        }
        transition={
          reducedMotion
            ? { duration: 0 }
            : {
                duration: 0.85,
                repeat: Infinity,
                delay: index * 0.16,
                ease: "easeInOut",
              }
        }
      />
    ))}
  </div>
)

const ChoiceBubble = ({
  reducedMotion,
  href,
  onClick,
  isLatest,
  children,
}: {
  reducedMotion: boolean
  href: string
  onClick?: () => void
  isLatest: boolean
  children: ReactNode
}) => {
  const motionProps = reducedMotion
    ? {}
    : {
        whileHover: { scale: 1.06, y: -2 },
        whileTap: { scale: 0.94, y: 2 },
        transition: pressSpring,
      }

  return (
    <motion.div
      className="self-end"
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, x: 10 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={followSpring}
      {...motionProps}
    >
      <Link href={href} onClick={onClick} className="block">
        <motion.span
          className={choiceClassName}
          initial={false}
          animate={{ borderRadius: choiceRadius(isLatest) }}
          transition={radiusSpring}
        >
          {children}
        </motion.span>
      </Link>
    </motion.div>
  )
}

export const LandingRoomChat = ({
  active,
  onBoardClick,
}: LandingRoomChatProps) => {
  const reducedMotion = usePrefersReducedMotion()
  const [shownCount, setShownCount] = useState(0)
  const [choiceCount, setChoiceCount] = useState(0)
  const delaysRef = useRef<number[] | null>(null)

  useEffect(() => {
    if (!active) return
    if (!delaysRef.current) {
      delaysRef.current = [
        Math.round(TYPING_MS + jitter(-120, 280)),
        ...BEATS.slice(1).map((beat) => delayAfterMessageMs(beat.chars)),
        Math.round(260 + jitter(40, 140)),
        Math.round(140 + jitter(30, 90)),
      ]
    }

    const delays = delaysRef.current
    let timeout = 0

    if (shownCount < BEATS.length) {
      timeout = window.setTimeout(() => {
        setShownCount((current) => current + 1)
      }, delays[shownCount] ?? 200)
    } else if (choiceCount < END_CHOICES.length) {
      timeout = window.setTimeout(() => {
        setChoiceCount((current) => current + 1)
      }, delays[BEATS.length + choiceCount] ?? 180)
    }

    return () => window.clearTimeout(timeout)
  }, [active, shownCount, choiceCount])

  if (!active) return null

  const typing = shownCount === 0
  const followUps = BEATS.slice(1, shownCount)
  const visibleChoices = END_CHOICES.slice(0, choiceCount)

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-20 max-h-[70svh]",
        "inset-x-4 bottom-4",
        "md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-sm md:translate-x-[-116.666%] md:-translate-y-1/2"
      )}
    >
      <div
        aria-label="Get started"
        aria-live="polite"
        className="flex h-full flex-col justify-end"
      >
        <motion.div className="flex flex-col justify-end" layout>
          <motion.div className="flex flex-col items-start gap-1" layout>
            <motion.div
              layout
              className="max-w-[92%] bg-background/85 px-3.5 py-2.5 text-[clamp(0.9375rem,0.85rem+0.3vw,1rem)] leading-snug text-foreground"
              initial={false}
              animate={{
                borderRadius: assistantRadius(shownCount <= 1),
              }}
              transition={{
                layout: layoutSpring,
                borderRadius: radiusSpring,
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {typing ? (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
                    transition={followSpring}
                  >
                    <TypingDots reducedMotion={reducedMotion} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="intro"
                    initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={layoutSpring}
                  >
                    {BEATS[0].content}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            <AnimatePresence>
              {followUps.map((line, index) => {
                const isLatest = index === followUps.length - 1 && shownCount > 1
                return (
                  <motion.div
                    key={line.id}
                    layout
                    initial={
                      reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }
                    }
                    animate={{
                      opacity: 1,
                      y: 0,
                      borderRadius: assistantRadius(isLatest),
                    }}
                    transition={{
                      ...followSpring,
                      layout: layoutSpring,
                      borderRadius: radiusSpring,
                    }}
                    className="max-w-[92%] bg-background/85 px-3.5 py-2.5 text-[clamp(0.9375rem,0.85rem+0.3vw,1rem)] leading-snug text-foreground"
                  >
                    {line.content}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </motion.div>
          {visibleChoices.length > 0 ? (
            <motion.div
              className="mt-2.5 flex flex-col items-end gap-1"
              layout
            >
              {visibleChoices.map((choice, index) => (
                <ChoiceBubble
                  key={choice.id}
                  reducedMotion={reducedMotion}
                  href={choice.href}
                  onClick={
                    choice.href === "/board" ? onBoardClick : undefined
                  }
                  isLatest={index === visibleChoices.length - 1}
                >
                  {choice.label}
                </ChoiceBubble>
              ))}
            </motion.div>
          ) : null}
        </motion.div>
      </div>
    </div>
  )
}
