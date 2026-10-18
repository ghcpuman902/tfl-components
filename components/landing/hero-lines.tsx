import { Fragment } from "react"
import type { HeroBreaks } from "@/lib/landing/hero-variants"
import type { Chunk } from "@/lib/landing/tagline-shape"

/**
 * `<br>` visibility for the breakpoints a gap breaks at: base, `md`, `lg`
 * (order sm, md, lg). Literal strings so Tailwind sees every class.
 */
const BREAK_CLASS: Record<string, string> = {
  "000": "hidden",
  "100": "inline md:hidden",
  "010": "hidden md:inline lg:hidden",
  "001": "hidden lg:inline",
  "110": "inline lg:hidden",
  "101": "inline md:hidden lg:inline",
  "011": "hidden md:inline",
  "111": "inline",
}

type HeroLinesProps = {
  chunks: readonly Chunk[]
  breaks: HeroBreaks
}

/**
 * Copy with the gate's explicit line breaks per breakpoint. The text stays
 * one run for readers and crawlers; only the `<br>`s change with width.
 * Parents add `text-balance` as the fallback for widths the gate did not
 * measure.
 */
export const HeroLines = ({ chunks, breaks }: HeroLinesProps) => (
  <>
    {chunks.map((chunk, index) => {
      if (index === chunks.length - 1) return chunk.text
      const key = [breaks.sm, breaks.md, breaks.lg]
        .map((set) => (set.includes(index) ? "1" : "0"))
        .join("")
      return (
        <Fragment key={index}>
          {chunk.text}{" "}
          {key === "000" ? null : <br className={BREAK_CLASS[key]} />}
        </Fragment>
      )
    })}
  </>
)
