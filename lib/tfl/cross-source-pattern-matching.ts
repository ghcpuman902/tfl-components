import type { ServicePatternDataset } from "@/lib/tfl/service-pattern-evidence"

export type ExternalStopPattern = {
  id: string
  stopNames: string[]
}

export type CrossSourcePatternMatch = {
  externalPatternId: string
  tflPatternId: string
  kind: "exact" | "limited-stop"
  omittedStationNames: string[]
  confidence: "normalised-name-sequence"
}

export const normalisePatternStationName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/^london\s+/, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\brail station\b/g, "")
    .replace(/\bunderground station\b/g, "")
    .replace(/\bdlr station\b/g, "")
    // OSM route relations tag each stop-position node with its platform,
    // e.g. "Poplar Platform 2" — not part of the station identity.
    .replace(/\bplatform\s*\d+[a-z]?\b/g, "")
    .replace(/\s*&\s*/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const candidateMatch = (
  external: ExternalStopPattern,
  tflPatternId: string,
  tflStationNames: readonly string[]
): CrossSourcePatternMatch | null => {
  if (external.stopNames.length < 2) return null
  const externalNames = external.stopNames.map(normalisePatternStationName)
  if (externalNames.some((name) => !name)) return null
  const tflNames = tflStationNames.map(normalisePatternStationName)
  const first = externalNames[0]!
  const last = externalNames[externalNames.length - 1]!
  let best: CrossSourcePatternMatch | null = null

  for (let start = 0; start < tflNames.length; start += 1) {
    if (tflNames[start] !== first) continue
    for (let end = start + 1; end < tflNames.length; end += 1) {
      if (tflNames[end] !== last) continue
      const slice = tflNames.slice(start, end + 1)
      const sliceDisplayNames = tflStationNames.slice(start, end + 1)
      const omittedStationNames: string[] = []
      let externalIndex = 0
      for (let index = 0; index < slice.length; index += 1) {
        if (slice[index] === externalNames[externalIndex]) {
          externalIndex += 1
        } else {
          omittedStationNames.push(sliceDisplayNames[index]!)
        }
      }
      if (externalIndex !== externalNames.length) continue
      const candidate: CrossSourcePatternMatch = {
        externalPatternId: external.id,
        tflPatternId,
        kind: omittedStationNames.length === 0 ? "exact" : "limited-stop",
        omittedStationNames,
        confidence: "normalised-name-sequence",
      }
      if (
        !best ||
        candidate.omittedStationNames.length < best.omittedStationNames.length
      ) {
        best = candidate
      }
    }
  }
  return best
}

export const matchExternalStopPatterns = (
  dataset: ServicePatternDataset | null,
  externalPatterns: readonly ExternalStopPattern[]
): CrossSourcePatternMatch[] => {
  if (!dataset) return []
  return externalPatterns.flatMap((external) => {
    let best: CrossSourcePatternMatch | null = null
    for (const pattern of dataset.patterns) {
      const candidate = candidateMatch(
        external,
        pattern.id,
        pattern.stationNames
      )
      if (
        candidate &&
        (!best ||
          candidate.omittedStationNames.length <
            best.omittedStationNames.length)
      ) {
        best = candidate
      }
    }
    return best ? [best] : []
  })
}
