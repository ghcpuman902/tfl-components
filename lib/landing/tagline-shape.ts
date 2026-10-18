/**
 * Tagline shape gate. A tagline is a wording, a shape and a set of line
 * breaks. This module is deterministic and has no I/O: give it marked-up
 * copy, a width measurer and the real container, and it enumerates explicit
 * break sets and picks the best passing one per breakpoint.
 *
 * Marked-up copy: spaces separate chunks, `{...}` glues words into one
 * non-breaking phrase unit, e.g. `Know {when to leave}. Without {picking up}
 * {your phone}.` Breaks only ever fall between chunks. Rules and sources are
 * in `_agent/tagline-gate-report.md`.
 */

export type Measure = (text: string) => number

export type Chunk = { text: string; wordCount: number }

export const parseMarkedText = (marked: string): Chunk[] => {
  const chunks: Chunk[] = []
  let depth = 0
  let raw = ""
  let groupHasText = false

  const flush = () => {
    if (!raw) return
    const text = raw.replace(/\s+/g, " ").trim()
    chunks.push({ text, wordCount: text.split(" ").length })
    raw = ""
  }

  for (const character of marked) {
    if (character === "{") {
      if (depth > 0) throw new Error(`Nested group in "${marked}"`)
      depth = 1
      groupHasText = false
      continue
    }
    if (character === "}") {
      if (depth === 0) throw new Error(`Unbalanced "}" in "${marked}"`)
      if (!groupHasText) {
        throw new Error(`Empty group in "${marked}"`)
      }
      depth = 0
      continue
    }
    if (character === " " && depth === 0) {
      flush()
      continue
    }
    if (depth > 0 && character !== " ") groupHasText = true
    raw += character
  }
  if (depth !== 0) throw new Error(`Unclosed group in "${marked}"`)
  flush()
  return chunks
}

export const plainText = (marked: string): string =>
  parseMarkedText(marked)
    .map((chunk) => chunk.text)
    .join(" ")

/**
 * Words a line must not end on: articles, determiners, possessives,
 * prepositions, conjunctions and the infinitive "to". Backstop for groups
 * the author forgot to annotate.
 */
export const FUNCTION_WORDS: ReadonlySet<string> = new Set([
  "a",
  "an",
  "the",
  "this",
  "that",
  "these",
  "those",
  "your",
  "my",
  "our",
  "its",
  "his",
  "her",
  "their",
  "no",
  "any",
  "some",
  "to",
  "of",
  "in",
  "on",
  "at",
  "by",
  "for",
  "with",
  "without",
  "from",
  "into",
  "onto",
  "about",
  "and",
  "or",
  "but",
  "nor",
  "if",
  "when",
  "while",
  "as",
  "than",
  "it",
])

export type Shape =
  | "single"
  | "balanced"
  | "long-short"
  | "short-long"
  | "long-short-long"
  | "short-short-long"
  | "long-short-short"
  | "short-long-short"

/** Lower is better. `short-long-short` is a bulge and is rejected. */
export const SHAPE_RANK: Record<Shape, number> = {
  single: 0,
  balanced: 0,
  "long-short": 1,
  "long-short-long": 1,
  "short-long": 2,
  "short-short-long": 2,
  "long-short-short": 2,
  "short-long-short": 99,
}

export type Reason =
  | "too-many-lines"
  | "line-overflow"
  | "single-word-last-line"
  | "runt-ratio"
  | "bad-shape"
  | "ends-with-function-word"

export type ShapeRules = {
  /** Hard cap on lines. */
  maxLines: number
  /** Longest line / shortest line may not exceed this. */
  maxRatio: number
  /** Widths within this ratio count as one length ("balanced"). */
  balancedRatio: number
  /** Two widths within this relative tolerance count as equal. */
  equalTolerance: number
  /** A line may use at most this share of the container (headroom for font fallback and hinting). */
  fitShare: number
  /** Soft preference. Outside it ranks lower; it does not fail. */
  preferredLines: readonly [number, number]
}

export type Layout = {
  breaks: readonly number[]
  lines: readonly { text: string; width: number }[]
  shape: Shape
  ratio: number
  reasons: readonly Reason[]
  softPenalty: number
}

export const classifyShape = (
  widths: readonly number[],
  rules: Pick<ShapeRules, "balancedRatio" | "equalTolerance">
): Shape => {
  if (widths.length === 1) return "single"
  const max = Math.max(...widths)
  const min = Math.min(...widths)
  if (max / min <= rules.balancedRatio) return "balanced"
  if (widths.length === 2) {
    return widths[0]! > widths[1]! ? "long-short" : "short-long"
  }
  const [a, b, c] = widths as [number, number, number]
  const tol = rules.equalTolerance
  if (b < a * (1 - tol) && b < c * (1 - tol)) return "long-short-long"
  if (a <= b * (1 + tol) && b <= c * (1 + tol)) return "short-short-long"
  if (a >= b * (1 - tol) && b >= c * (1 - tol)) return "long-short-short"
  return "short-long-short"
}

const lastWord = (line: string): string =>
  (line.split(" ").pop() ?? "").replace(/[^\p{L}\p{N}']/gu, "").toLowerCase()

export const evaluateBreaks = (
  chunks: readonly Chunk[],
  breaks: readonly number[],
  containerPx: number,
  measure: Measure,
  rules: ShapeRules
): Layout => {
  const lines: { text: string; width: number }[] = []
  let start = 0
  for (const after of [...breaks, chunks.length - 1]) {
    const text = chunks
      .slice(start, after + 1)
      .map((chunk) => chunk.text)
      .join(" ")
    lines.push({ text, width: measure(text) })
    start = after + 1
  }
  const widths = lines.map((line) => line.width)
  const ratio = Math.max(...widths) / Math.min(...widths)
  const shape = classifyShape(widths, rules)
  const reasons: Reason[] = []

  if (lines.length > rules.maxLines) reasons.push("too-many-lines")
  if (widths.some((width) => width > containerPx * rules.fitShare)) {
    reasons.push("line-overflow")
  }
  if (lines.length > 1) {
    const last = lines[lines.length - 1]!
    if (!last.text.includes(" ")) reasons.push("single-word-last-line")
    if (ratio > rules.maxRatio) reasons.push("runt-ratio")
    if (SHAPE_RANK[shape] >= 99) reasons.push("bad-shape")
    if (
      lines.slice(0, -1).some((line) => FUNCTION_WORDS.has(lastWord(line.text)))
    ) {
      reasons.push("ends-with-function-word")
    }
  }

  const [lo, hi] = rules.preferredLines
  const softPenalty = lines.length < lo || lines.length > hi ? 1 : 0
  return { breaks, lines, shape, ratio, reasons, softPenalty }
}

/** Every subset of the `chunkCount - 1` gaps with at most `maxBreaks` members. */
export const enumerateBreakSets = (
  chunkCount: number,
  maxBreaks: number
): number[][] => {
  const gaps = Array.from({ length: Math.max(0, chunkCount - 1) }, (_, i) => i)
  const sets: number[][] = [[]]
  const extend = (from: number, current: number[]) => {
    if (current.length === maxBreaks) return
    for (let index = from; index < gaps.length; index += 1) {
      const next = [...current, gaps[index]!]
      sets.push(next)
      extend(index + 1, next)
    }
  }
  extend(0, [])
  return sets
}

const compareLayouts = (a: Layout, b: Layout): number =>
  a.softPenalty - b.softPenalty ||
  SHAPE_RANK[a.shape] - SHAPE_RANK[b.shape] ||
  a.ratio - b.ratio ||
  a.lines.length - b.lines.length ||
  a.breaks.join().localeCompare(b.breaks.join())

export type TextResult = {
  pass: boolean
  /** Best passing layout, or when none passes the one with fewest violations. */
  chosen: Layout
  evaluated: number
  /** How many layouts each rule rejected. */
  rejectedBy: Partial<Record<Reason, number>>
}

export const checkText = (
  marked: string,
  containerPx: number,
  measure: Measure,
  rules: ShapeRules
): TextResult => {
  const chunks = parseMarkedText(marked)
  const sets = enumerateBreakSets(chunks.length, rules.maxLines - 1)
  const layouts = sets.map((set) =>
    evaluateBreaks(chunks, set, containerPx, measure, rules)
  )
  const rejectedBy: Partial<Record<Reason, number>> = {}
  for (const layout of layouts) {
    for (const reason of layout.reasons) {
      rejectedBy[reason] = (rejectedBy[reason] ?? 0) + 1
    }
  }
  const passing = layouts.filter((layout) => layout.reasons.length === 0)
  if (passing.length > 0) {
    return {
      pass: true,
      chosen: passing.sort(compareLayouts)[0]!,
      evaluated: layouts.length,
      rejectedBy,
    }
  }
  const closest = [...layouts].sort(
    (a, b) => a.reasons.length - b.reasons.length || compareLayouts(a, b)
  )[0]!
  return { pass: false, chosen: closest, evaluated: layouts.length, rejectedBy }
}

/** ASCII shape: one row per line, a bar scaled to the container, width in px. */
export const renderAscii = (
  layout: Layout,
  containerPx: number,
  barColumns = 36
): string =>
  layout.lines
    .map((line) => {
      const filled = Math.max(
        1,
        Math.min(
          barColumns,
          Math.round((line.width / containerPx) * barColumns)
        )
      )
      const bar = "#".repeat(filled).padEnd(barColumns, ".")
      return `    ${bar} ${String(Math.round(line.width)).padStart(4)}px  ${line.text}`
    })
    .join("\n")
