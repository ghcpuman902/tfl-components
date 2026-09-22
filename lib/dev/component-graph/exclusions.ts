const DEFAULT_EXCLUDED_SUFFIXES = [
  "/page-skeletons.tsx",
  "/week-ahead-skeleton.tsx",
] as const

const DEFAULT_EXCLUDED_PATHS = new Set<string>([
  "components/tfl/station-typography-lab.tsx",
  "components/tfl/maps/geographic-map-placeholder.tsx",
])

const DEFAULT_EXCLUDED_PREFIXES = [
  "components/tfl/week-ahead/",
  "components/tfl/live-vehicles/",
] as const

export const defaultExclusionReason = (moduleId: string): string | undefined => {
  if (DEFAULT_EXCLUDED_PATHS.has(moduleId)) {
    return "Site lab or placeholder surface."
  }
  for (const prefix of DEFAULT_EXCLUDED_PREFIXES) {
    if (moduleId.startsWith(prefix)) {
      return "Block / lab surface, not a reusable library component."
    }
  }
  for (const suffix of DEFAULT_EXCLUDED_SUFFIXES) {
    if (moduleId.endsWith(suffix)) {
      return "Shared skeleton helper."
    }
  }
  if (moduleId.includes("/__tests__/") || moduleId.includes(".test.")) {
    return "Test file."
  }
  return undefined
}
