import { inspect } from "node:util"
import { formatStationName } from "../../lib/tfl/diagram-station.ts"
import { applyStationAbbreviations } from "../../lib/tfl/station-abbreviations.ts"

type NameRule = readonly [match: string | RegExp, to: string]

/**
 * Playground tidy-ups after `formatStationName`, before St/Pk abbr.
 * `Terminals` before `Terminal`. `^London` only in front of NR termini.
 */
const NAME_RULES: readonly NameRule[] = [
  [/\bTerminals\s+/gi, "T"],
  [/\bTerminal\s+/gi, "T"],
  [/^London\s+(?=Paddington)/i, ""],
]

const applyNameRules = (name: string) => {
  let next = name
  for (const [match, to] of NAME_RULES) {
    next =
      typeof match === "string"
        ? next.replaceAll(match, to)
        : next.replace(match, to)
  }
  return next.replace(/\s+/g, " ").trim()
}

export const tidyStationName = (raw: string) =>
  applyStationAbbreviations(applyNameRules(formatStationName(raw)))

export const tidyRouteLabel = (name: string) =>
  name
    .replace(/\s*&harr;\s*/g, " ↔ ")
    .replace(/\s+/g, " ")
    .trim()

export const writeProgress = (done: number, total: number, label = "") => {
  if (!process.stderr.isTTY) return
  const width = 28
  const ratio = total === 0 ? 1 : Math.min(1, Math.max(0, done / total))
  const filled = Math.round(ratio * width)
  const bar = `${"█".repeat(filled)}${"░".repeat(width - filled)}`
  process.stderr.write(`\r  ${bar} ${done}/${total}  ${label}`.padEnd(80))
  if (done >= total) process.stderr.write("\n")
}

export const printResult = (value: unknown) => {
  if (Array.isArray(value) && value.length === 0) {
    console.log("[]  (0 items)")
    return
  }
  console.log(
    inspect(value, {
      colors: Boolean(process.stdout.isTTY),
      depth: null,
      maxArrayLength: null,
      maxStringLength: null,
      compact: true,
    })
  )
}

export const printBanner = () => {
  const at = new Date().toLocaleTimeString("en-GB", { hour12: false })
  console.log(`—— ${at}  playground ——`)
}
