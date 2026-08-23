/**
 * Group StopPoint additionalProperties for Explorer.
 * NearestPlaces is a repeated SourceSystemPlaceId list (bike docks, taxi ranks)
 * copied onto nearby stops — collapse it instead of 30 duplicate rows.
 */

export type StopAdditionalProperty = {
  key?: string
  value?: string
  category?: string
}

const LIFTED_STOP_PROPERTY_KEYS = new Set([
  "towards",
  "compasspoint",
  "smscode",
])

const CATEGORY_LABELS: Record<string, string> = {
  Facility: "Facilities",
  Address: "Address",
  Geo: "Geo",
  Accessibility: "Accessibility",
  "Opening Time": "Opening times",
  ServiceInfo: "Service",
  Direction: "Direction",
  StationOwnedByTfl: "Ownership",
  VisitorCentre: "Visitor centre",
}

const NEAREST_PREFIX_LABELS: Record<string, string> = {
  BikePoints: "Bike hire",
  TaxiRank: "Taxi ranks",
}

export type AdditionalPropertyGroup = {
  category: string
  label: string
  properties: StopAdditionalProperty[]
}

export type NearestPlaceBucket = {
  prefix: string
  label: string
  values: string[]
}

export type GroupedAdditionalProperties = {
  groups: AdditionalPropertyGroup[]
  nearestPlaces: NearestPlaceBucket[]
  extraCount: number
}

export const isLiftedStopPropertyKey = (key?: string): boolean => {
  const trimmed = key?.trim()
  if (!trimmed) return true
  return LIFTED_STOP_PROPERTY_KEYS.has(trimmed.toLowerCase())
}

export const nearestPlacePrefix = (value: string): string => {
  const trimmed = value.trim()
  const split = trimmed.indexOf("_")
  return split > 0 ? trimmed.slice(0, split) : trimmed
}

const isNearestPlace = (prop: StopAdditionalProperty): boolean => {
  if (prop.category?.toLowerCase() === "nearestplaces") return true
  return prop.key?.toLowerCase() === "sourcesystemplaceid"
}

const categoryLabel = (category: string): string =>
  CATEGORY_LABELS[category] ?? category

const bucketLabel = (prefix: string): string =>
  NEAREST_PREFIX_LABELS[prefix] ?? prefix

/** Remaining bag after Direction / SMS lifts, with NearestPlaces split out. */
export const groupAdditionalProperties = (
  properties: readonly StopAdditionalProperty[]
): GroupedAdditionalProperties => {
  const extra = properties.filter((prop) => !isLiftedStopPropertyKey(prop.key))
  const nearestValues: string[] = []
  const byCategory = new Map<string, StopAdditionalProperty[]>()

  for (const prop of extra) {
    if (isNearestPlace(prop)) {
      const value = prop.value?.trim()
      if (value) nearestValues.push(value)
      continue
    }
    const category = prop.category?.trim() || "Other"
    const list = byCategory.get(category) ?? []
    list.push(prop)
    byCategory.set(category, list)
  }

  const nearestByPrefix = new Map<string, string[]>()
  for (const value of nearestValues) {
    const prefix = nearestPlacePrefix(value)
    const list = nearestByPrefix.get(prefix) ?? []
    list.push(value)
    nearestByPrefix.set(prefix, list)
  }

  const nearestPlaces: NearestPlaceBucket[] = [
    ...nearestByPrefix.entries(),
  ].map(([prefix, values]) => ({
    prefix,
    label: bucketLabel(prefix),
    values,
  }))

  const groups: AdditionalPropertyGroup[] = [...byCategory.entries()].map(
    ([category, categoryProperties]) => ({
      category,
      label: categoryLabel(category),
      properties: categoryProperties,
    })
  )

  return {
    groups,
    nearestPlaces,
    extraCount: extra.length,
  }
}
